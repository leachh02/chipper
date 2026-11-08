package io.github.leachh02.chipper.sync;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.github.leachh02.chipper.auth.ChipperUser;
import io.github.leachh02.chipper.sync.SyncRepository.Incoming;
import io.github.leachh02.chipper.sync.SyncRepository.PushResult;
import io.github.leachh02.chipper.sync.SyncRepository.SyncRecord;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

// A device pulls what changed since the revision it last saw, merges it into
// its own copy, then pushes its own changes against that same revision.
@RestController
@RequestMapping("/api/sync")
public class SyncController {

	public record Pulled(long revision, List<SyncRecord> records) {
	}

	public record Push(@PositiveOrZero long base, @NotNull @Size(max = 50_000) List<@Valid Record> records) {
		public record Record(
				@NotNull @Pattern(regexp = "video|album|episode|event|preferences") String kind,
				@NotBlank @Size(max = 200) String id,
				@NotNull JsonNode data) {
		}
	}

	public record Pushed(long revision) {
	}

	public record Conflict(long revision, List<String> records) {
	}

	private final SyncRepository sync;
	private final SyncStream stream;

	public SyncController(SyncRepository sync, SyncStream stream) {
		this.sync = sync;
		this.stream = stream;
	}

	@GetMapping
	public Pulled pull(@AuthenticationPrincipal ChipperUser user, @RequestParam(defaultValue = "0") long since) {
		// Read the revision first: anything pushed in between comes back
		// again next time, which is harmless
		long revision = sync.revision(user.id());
		return new Pulled(revision, sync.changedSince(user.id(), since));
	}

	@PostMapping
	public ResponseEntity<?> push(@AuthenticationPrincipal ChipperUser user, @Valid @RequestBody Push body) {
		if (body.records().isEmpty()) {
			return ResponseEntity.ok(new Pushed(sync.revision(user.id())));
		}
		var records = body.records().stream().map(r -> new Incoming(r.kind(), r.id(), r.data())).toList();
		return switch (sync.push(user.id(), body.base(), records)) {
			case PushResult.Accepted(long revision) -> {
				stream.changed(user.id(), revision);
				yield ResponseEntity.ok(new Pushed(revision));
			}
			case PushResult.Conflict(long revision, List<String> clashes) ->
				ResponseEntity.status(HttpStatus.CONFLICT).body(new Conflict(revision, clashes));
		};
	}

	@GetMapping(path = "/stream", produces = "text/event-stream")
	public SseEmitter stream(@AuthenticationPrincipal ChipperUser user) {
		return stream.open(user.id(), sync.revision(user.id()));
	}

}
