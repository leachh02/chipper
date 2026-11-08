package io.github.leachh02.chipper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

// Each test class gets a fresh SQLite database in a temporary folder
@SpringBootTest
@AutoConfigureMockMvc
abstract class ServerTest {

	static final String ADMIN = "admin";
	static final String PASSWORD = "correct horse";

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper json;

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) throws Exception {
		Path dir = Files.createTempDirectory("chipper-test");
		registry.add("chipper.data-dir", dir::toString);
	}

	// The admin's token, creating the account the first time
	String adminToken() throws Exception {
		JsonNode status = body(mvc.perform(get("/api/status")).andReturn());
		String path = status.get("needsSetup").asBoolean() ? "/api/auth/setup" : "/api/auth/login";
		return body(send(post(path), null, credentials(ADMIN, PASSWORD))).get("token").asString();
	}

	// Creates a user through the admin and signs them in
	String newUserToken(String username) throws Exception {
		send(post("/api/users"), adminToken(),
				"{\"username\":\"%s\",\"password\":\"%s\",\"admin\":false}".formatted(username, PASSWORD));
		return body(send(post("/api/auth/login"), null, credentials(username, PASSWORD))).get("token").asString();
	}

	MvcResult send(MockHttpServletRequestBuilder request, String token, String content) throws Exception {
		if (token != null) {
			request.header("Authorization", "Bearer " + token);
		}
		if (content != null) {
			request.contentType(MediaType.APPLICATION_JSON).content(content);
		}
		return mvc.perform(request).andReturn();
	}

	JsonNode body(MvcResult result) throws Exception {
		return json.readTree(result.getResponse().getContentAsString());
	}

	static String credentials(String username, String password) {
		return "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password);
	}

}
