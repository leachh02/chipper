package io.github.leachh02.chipper.clusters;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

// Talks to the optional clustering service in apps/ai, at CHIPPER_AI_URL.
// Grouping by topic is offered only while that service answers, so the
// Docker setup can always set the address and leave the service optional.
@Component
public class AiClient {

	// text is what the model reads; groups are named from name's words
	public record Item(String id, String text, String name) {
	}

	public record Group(String label, List<String> ids) {
	}

	private record Request(List<Item> items, Integer groups) {
	}

	private record Response(List<Group> groups) {
	}

	// How long to trust the last check of whether the service is up
	private static final Duration RECHECK = Duration.ofSeconds(30);

	private final RestClient http;
	private final RestClient health;
	private volatile boolean up;
	private volatile long checkedAt;

	public AiClient(@Value("${chipper.ai-url:}") String url) {
		var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		var requests = new JdkClientHttpRequestFactory(client);
		// Choosing the number of groups for a big backlog takes a while
		requests.setReadTimeout(Duration.ofMinutes(5));
		this.http = url.isBlank() ? null : RestClient.builder().baseUrl(url).requestFactory(requests).build();

		var quick = new JdkClientHttpRequestFactory(
				HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build());
		quick.setReadTimeout(Duration.ofSeconds(2));
		this.health = url.isBlank() ? null : RestClient.builder().baseUrl(url).requestFactory(quick).build();
	}

	public boolean enabled() {
		if (health == null) {
			return false;
		}
		long now = System.nanoTime();
		if (checkedAt == 0 || now - checkedAt > RECHECK.toNanos()) {
			up = answers();
			checkedAt = now;
		}
		return up;
	}

	private boolean answers() {
		try {
			health.get().uri("/health").retrieve().toBodilessEntity();
			return true;
		}
		catch (RestClientException e) {
			return false;
		}
	}

	// groups is null to let the service choose
	public List<Group> cluster(List<Item> items, Integer groups) {
		return http.post().uri("/cluster").body(new Request(items, groups)).retrieve().body(Response.class).groups();
	}

}
