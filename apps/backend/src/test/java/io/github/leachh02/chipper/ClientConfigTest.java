package io.github.leachh02.chipper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = "chipper.spotify-client-id=abc123")
class ClientConfigTest extends ServerTest {

	@Test
	void theAppGetsItsSettingsFromTheServer() throws Exception {
		var response = mvc.perform(get("/config.js")).andReturn().getResponse();
		assertThat(response.getStatus()).isEqualTo(200);
		assertThat(response.getContentType()).startsWith("text/javascript");
		assertThat(response.getHeader("Cache-Control")).isEqualTo("no-cache");
		assertThat(response.getContentAsString())
			.isEqualTo("window.CHIPPER_CONFIG = {\"spotifyClientId\":\"abc123\"};\n");
	}

}
