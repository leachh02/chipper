package io.github.leachh02.chipper.web;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.ObjectMapper;

// The app's settings that come from this server rather than its build, so
// one published image works for everyone. The app's index.html loads this
// before anything else.
@RestController
public class ClientConfigController {

	private final String script;

	public ClientConfigController(@Value("${chipper.spotify-client-id}") String spotifyClientId,
			ObjectMapper json) {
		this.script = "window.CHIPPER_CONFIG = "
				+ json.writeValueAsString(Map.of("spotifyClientId", spotifyClientId.trim())) + ";\n";
	}

	@GetMapping(value = "/config.js", produces = "text/javascript")
	public ResponseEntity<String> config() {
		return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(script);
	}

}
