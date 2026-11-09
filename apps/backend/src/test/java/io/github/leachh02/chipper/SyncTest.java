package io.github.leachh02.chipper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;

class SyncTest extends ServerTest {

	private JsonNode pull(String token, long since) throws Exception {
		return body(send(get("/api/sync?since=" + since), token, null));
	}

	private org.springframework.test.web.servlet.MvcResult push(String token, long base, String records)
			throws Exception {
		return send(post("/api/sync"), token, "{\"base\":%d,\"records\":[%s]}".formatted(base, records));
	}

	private static String video(String id, String status) {
		return "{\"kind\":\"video\",\"id\":\"%s\",\"data\":{\"id\":\"%s\",\"status\":\"%s\"}}".formatted(id, id, status);
	}

	@Test
	void pushedRecordsComeBackOnPull() throws Exception {
		String token = newUserToken("pat");
		var pushed = push(token, 0, video("a", "queued") + "," + video("b", "completed"));
		assertThat(pushed.getResponse().getStatus()).isEqualTo(200);
		long revision = body(pushed).get("revision").asLong();

		JsonNode pulled = pull(token, 0);
		assertThat(pulled.get("revision").asLong()).isEqualTo(revision);
		assertThat(pulled.get("records")).hasSize(2);
		assertThat(pulled.get("records").get(1).get("data").get("status").asString()).isEqualTo("completed");

		assertThat(pull(token, revision).get("records")).isEmpty();
	}

	@Test
	void eachUserOnlySeesTheirOwn() throws Exception {
		String one = newUserToken("one");
		String two = newUserToken("two");
		push(one, 0, video("mine", "queued"));
		assertThat(pull(two, 0).get("records")).isEmpty();
	}

	@Test
	void stalePushOfTheSameRecordIsRefused() throws Exception {
		String token = newUserToken("lee");
		long first = body(push(token, 0, video("a", "queued"))).get("revision").asLong();

		// Phone and laptop both pulled at `first`. The phone pushes first.
		long phone = body(push(token, first, video("a", "completed"))).get("revision").asLong();
		var laptop = push(token, first, video("a", "skipped"));

		assertThat(laptop.getResponse().getStatus()).isEqualTo(409);
		JsonNode conflict = body(laptop);
		assertThat(conflict.get("revision").asLong()).isEqualTo(phone);
		assertThat(conflict.get("records").get(0).asString()).isEqualTo("video:a");
		// Nothing from the refused push was saved
		assertThat(pull(token, 0).get("records").get(0).get("data").get("status").asString()).isEqualTo("completed");
	}

	@Test
	void stalePushOfOtherRecordsIsFine() throws Exception {
		String token = newUserToken("max");
		long first = body(push(token, 0, video("a", "queued"))).get("revision").asLong();
		push(token, first, video("a", "completed"));

		var other = push(token, first, video("b", "queued"));
		assertThat(other.getResponse().getStatus()).isEqualTo(200);
	}

	@Test
	void eventsNeverClash() throws Exception {
		String token = newUserToken("ash");
		String event = "{\"kind\":\"event\",\"id\":\"e1\",\"data\":{\"id\":\"e1\"}}";
		long first = body(push(token, 0, event)).get("revision").asLong();
		push(token, first, video("a", "queued"));

		assertThat(push(token, first, event).getResponse().getStatus()).isEqualTo(200);
	}

	@Test
	void unknownKindsAreRejected() throws Exception {
		String token = newUserToken("ray");
		var result = push(token, 0, "{\"kind\":\"secrets\",\"id\":\"x\",\"data\":{}}");
		assertThat(result.getResponse().getStatus()).isEqualTo(400);
	}

}
