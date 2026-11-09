package io.github.leachh02.chipper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

class AuthTest extends ServerTest {

	@Autowired
	JdbcClient jdbc;

	@Test
	void firstAccountIsAdminAndSetupOnlyWorksOnce() throws Exception {
		String token = adminToken();
		assertThat(body(send(get("/api/auth/me"), token, null)).get("admin").asBoolean()).isTrue();
		assertThat(body(send(get("/api/status"), null, null)).get("needsSetup").asBoolean()).isFalse();

		var again = send(post("/api/auth/setup"), null, credentials("intruder", PASSWORD));
		assertThat(again.getResponse().getStatus()).isEqualTo(409);
	}

	@Test
	void apiNeedsAToken() throws Exception {
		assertThat(send(get("/api/sync"), null, null).getResponse().getStatus()).isEqualTo(401);
		assertThat(send(get("/api/sync"), "made-up", null).getResponse().getStatus()).isEqualTo(401);
	}

	@Test
	void wrongPasswordIsRefused() throws Exception {
		adminToken();
		var result = send(post("/api/auth/login"), null, credentials(ADMIN, "not the password"));
		assertThat(result.getResponse().getStatus()).isEqualTo(401);
	}

	@Test
	void usernamesIgnoreCase() throws Exception {
		adminToken();
		var result = send(post("/api/auth/login"), null, credentials("ADMIN", PASSWORD));
		assertThat(result.getResponse().getStatus()).isEqualTo(200);
	}

	@Test
	void onlyAdminsManageUsers() throws Exception {
		String user = newUserToken("sam");
		assertThat(send(get("/api/users"), user, null).getResponse().getStatus()).isEqualTo(403);
		assertThat(send(get("/api/users"), adminToken(), null).getResponse().getStatus()).isEqualTo(200);
	}

	@Test
	void signingOutEndsTheToken() throws Exception {
		String token = newUserToken("alex");
		send(post("/api/auth/logout"), token, null);
		assertThat(send(get("/api/auth/me"), token, null).getResponse().getStatus()).isEqualTo(401);
	}

	@Test
	void changingPasswordSignsOutOtherDevices() throws Exception {
		String phone = newUserToken("jo");
		String laptop = body(send(post("/api/auth/login"), null, credentials("jo", PASSWORD))).get("token").asString();

		var change = send(put("/api/auth/password"), laptop,
				"{\"currentPassword\":\"%s\",\"newPassword\":\"a brand new one\"}".formatted(PASSWORD));
		assertThat(change.getResponse().getStatus()).isEqualTo(204);
		assertThat(send(get("/api/auth/me"), phone, null).getResponse().getStatus()).isEqualTo(401);
		assertThat(send(get("/api/auth/me"), laptop, null).getResponse().getStatus()).isEqualTo(200);
	}

	@Test
	void deletingAUserRemovesTheirData() throws Exception {
		String token = newUserToken("kim");
		send(post("/api/sync"), token, "{\"base\":0,\"records\":[{\"kind\":\"video\",\"id\":\"v1\",\"data\":{}}]}");
		long id = body(send(get("/api/auth/me"), token, null)).get("id").asLong();

		var result = send(delete("/api/users/" + id), adminToken(), null);
		assertThat(result.getResponse().getStatus()).isEqualTo(204);
		assertThat(send(get("/api/auth/me"), token, null).getResponse().getStatus()).isEqualTo(401);
		long left = jdbc.sql("SELECT COUNT(*) FROM records WHERE user_id = ?").param(id).query(Long.class).single();
		assertThat(left).isZero();
	}

	@Test
	void adminCantDeleteThemselves() throws Exception {
		String token = adminToken();
		long id = body(send(get("/api/auth/me"), token, null)).get("id").asLong();
		assertThat(send(delete("/api/users/" + id), token, null).getResponse().getStatus()).isEqualTo(409);
	}

}
