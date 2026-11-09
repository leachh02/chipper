package io.github.leachh02.chipper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.ResourceAccessException;

import io.github.leachh02.chipper.clusters.AiClient;
import tools.jackson.databind.JsonNode;

class ClusterTest extends ServerTest {

	@MockitoBean
	AiClient ai;

	@BeforeEach
	void aiIsSetUp() {
		when(ai.enabled()).thenReturn(true);
	}

	private void pushVideos(String token, String... records) throws Exception {
		send(post("/api/sync"), token, "{\"base\":0,\"records\":[%s]}".formatted(String.join(",", records)));
	}

	private static String video(String id, String status, String extra) {
		return """
				{"kind":"video","id":"%s","data":{"id":"%s","title":"Title %s","channel":"Channel","status":"%s"%s}}"""
			.formatted(id, id, id, status, extra);
	}

	@Test
	void groupsTheBacklogAndSyncsTheResult() throws Exception {
		String token = newUserToken("sam");
		pushVideos(token, video("a", "queued", ""), video("b", "in_progress", ""), video("c", "deferred", ""),
				video("done", "completed", ""), video("gone", "queued", ",\"removedAt\":1"));
		when(ai.cluster(any(), eq(2))).thenReturn(List.of(new AiClient.Group("Cooking", List.of("a", "b")),
				new AiClient.Group("Space", List.of("c"))));

		var result = send(post("/api/clusters"), token, "{\"kind\":\"video\",\"groups\":2}");
		assertThat(result.getResponse().getStatus()).isEqualTo(200);
		assertThat(body(result).get("groups").get(0).get("label").asString()).isEqualTo("Cooking");

		// Only what's still waiting is sent, described by title and channel
		@SuppressWarnings("unchecked")
		ArgumentCaptor<List<AiClient.Item>> items = ArgumentCaptor.forClass(List.class);
		verify(ai).cluster(items.capture(), eq(2));
		assertThat(items.getValue()).extracting(AiClient.Item::id).containsExactlyInAnyOrder("a", "b", "c");
		assertThat(items.getValue().get(0).text()).isEqualTo("Title a (Channel)");
		assertThat(items.getValue().get(0).name()).isEqualTo("Title a");

		// Every device gets the groups through sync
		JsonNode records = body(send(get("/api/sync?since=0"), token, null)).get("records");
		JsonNode cluster = records.get(records.size() - 1);
		assertThat(cluster.get("kind").asString()).isEqualTo("cluster");
		assertThat(cluster.get("id").asString()).isEqualTo("video");
		assertThat(cluster.get("data").get("groups")).hasSize(2);
		assertThat(cluster.get("data").get("requested").asInt()).isEqualTo(2);
	}

	@Test
	void anEmptyBacklogHasNothingToGroup() throws Exception {
		String token = newUserToken("kim");
		var result = send(post("/api/clusters"), token, "{\"kind\":\"episode\"}");
		assertThat(result.getResponse().getStatus()).isEqualTo(422);
	}

	@Test
	void aServiceThatDoesntAnswerIsReported() throws Exception {
		String token = newUserToken("jo");
		pushVideos(token, video("a", "queued", ""));
		when(ai.cluster(any(), any())).thenThrow(new ResourceAccessException("Connection refused"));
		assertThat(send(post("/api/clusters"), token, "{\"kind\":\"video\"}").getResponse().getStatus())
			.isEqualTo(502);
	}

	@Test
	void switchedOffWithoutTheService() throws Exception {
		when(ai.enabled()).thenReturn(false);
		String token = newUserToken("ali");
		assertThat(body(mvc.perform(get("/api/status")).andReturn()).get("clusters").asBoolean()).isFalse();
		assertThat(send(post("/api/clusters"), token, "{\"kind\":\"video\"}").getResponse().getStatus())
			.isEqualTo(404);
	}

	@Test
	void onlyVideosAndEpisodes() throws Exception {
		String token = newUserToken("ren");
		assertThat(send(post("/api/clusters"), token, "{\"kind\":\"album\"}").getResponse().getStatus())
			.isEqualTo(400);
		assertThat(send(post("/api/clusters"), token, "{\"kind\":\"video\",\"groups\":1}").getResponse().getStatus())
			.isEqualTo(400);
	}

	@Test
	void devicesCantPushGroups() throws Exception {
		String token = newUserToken("val");
		var result = send(post("/api/sync"), token,
				"{\"base\":0,\"records\":[{\"kind\":\"cluster\",\"id\":\"video\",\"data\":{}}]}");
		assertThat(result.getResponse().getStatus()).isEqualTo(400);
	}

}
