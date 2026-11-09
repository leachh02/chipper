package io.github.leachh02.chipper.clusters;

import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import io.github.leachh02.chipper.auth.ChipperUser;
import io.github.leachh02.chipper.sync.SyncRepository;
import io.github.leachh02.chipper.sync.SyncRepository.Incoming;
import io.github.leachh02.chipper.sync.SyncRepository.PushResult;
import io.github.leachh02.chipper.sync.SyncStream;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

// Groups what's left in a user's backlog by topic. The groups are saved as a
// synced "cluster" record, so every one of their devices gets them; only the
// server writes those.
@RestController
@RequestMapping("/api/clusters")
public class ClusterController {

	public record Regroup(@NotNull @Pattern(regexp = "video|episode") String kind,
			// Null lets the service choose
			@Min(2) @Max(30) Integer groups) {
	}

	public record Clusters(String id, String itemType, List<AiClient.Group> groups, Integer requested,
			long createdAt) {
	}

	// Still in the backlog: not finished, skipped, or gone from the service
	private static final Set<String> WAITING = Set.of("queued", "in_progress", "deferred");

	private final AiClient ai;
	private final SyncRepository sync;
	private final SyncStream stream;
	private final ObjectMapper json;

	public ClusterController(AiClient ai, SyncRepository sync, SyncStream stream, ObjectMapper json) {
		this.ai = ai;
		this.sync = sync;
		this.stream = stream;
		this.json = json;
	}

	@PostMapping
	public Clusters regroup(@AuthenticationPrincipal ChipperUser user, @Valid @RequestBody Regroup body) {
		if (!ai.enabled()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Grouping by topic isn't running on this server.");
		}

		List<AiClient.Item> items = sync.records(user.id(), body.kind())
			.stream()
			.filter(r -> WAITING.contains(r.path("status").asString("")) && r.path("removedAt").isMissingNode())
			.map(r -> new AiClient.Item(r.path("id").asString(), describe(body.kind(), r), title(body.kind(), r)))
			.toList();
		if (items.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
					"There's nothing in your backlog to group yet.");
		}

		List<AiClient.Group> groups;
		try {
			groups = ai.cluster(items, body.groups());
		}
		catch (RestClientException e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The grouping service didn't answer.", e);
		}

		var clusters = new Clusters(body.kind(), body.kind(), groups, body.groups(), System.currentTimeMillis());
		JsonNode data = json.valueToTree(clusters);
		// Against the latest revision, and no device ever pushes this record,
		// so it can't clash
		if (sync.push(user.id(), sync.revision(user.id()),
				List.of(new Incoming("cluster", body.kind(), data))) instanceof PushResult.Accepted(long revision)) {
			stream.changed(user.id(), revision);
		}
		return clusters;
	}

	// What the model reads: the title, with the channel or show for context
	private static String describe(String kind, JsonNode r) {
		return "%s (%s)".formatted(title(kind, r), r.path(kind.equals("video") ? "channel" : "show").asString(""));
	}

	// Groups are named from titles alone, or channel names would win out
	private static String title(String kind, JsonNode r) {
		return r.path(kind.equals("video") ? "title" : "name").asString("");
	}

}
