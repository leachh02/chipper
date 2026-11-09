package io.github.leachh02.chipper.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.leachh02.chipper.clusters.AiClient;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api")
public class AuthController {

	// clusters: whether this server can group a backlog by topic
	public record Status(boolean needsSetup, String version, boolean clusters) {
	}

	public record Credentials(
			@NotBlank @Size(max = 64) String username,
			@NotBlank @Size(min = 8, max = 200) String password,
			@Size(max = 100) String device) {
	}

	public record SignedIn(String token, ChipperUser user) {
	}

	public record PasswordChange(@NotBlank String currentPassword,
			@NotBlank @Size(min = 8, max = 200) String newPassword) {
	}

	private final UserRepository users;
	private final TokenService tokens;
	private final PasswordEncoder passwords;
	private final AiClient ai;

	public AuthController(UserRepository users, TokenService tokens, PasswordEncoder passwords, AiClient ai) {
		this.users = users;
		this.tokens = tokens;
		this.passwords = passwords;
		this.ai = ai;
	}

	// Lets the app know whether to show the first-run "create your account" step
	@GetMapping("/status")
	public Status status() {
		String version = getClass().getPackage().getImplementationVersion();
		return new Status(users.isEmpty(), version != null ? version : "dev", ai.enabled());
	}

	// Creates the first account, which is the admin. Only works on a server
	// with no accounts yet.
	@PostMapping("/auth/setup")
	public synchronized SignedIn setup(@Valid @RequestBody Credentials body) {
		if (!users.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "This server already has an admin.");
		}
		ChipperUser user = users.create(body.username().trim(), passwords.encode(body.password()), true);
		return new SignedIn(tokens.issue(user.id(), body.device()), user);
	}

	@PostMapping("/auth/login")
	public SignedIn login(@Valid @RequestBody Credentials body) {
		var stored = users.findByUsername(body.username().trim())
			.filter(u -> passwords.matches(body.password(), u.passwordHash()))
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
					"That username and password don't match."));
		return new SignedIn(tokens.issue(stored.id(), body.device()), stored.toUser());
	}

	@PostMapping("/auth/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(HttpServletRequest request) {
		tokens.revoke(TokenFilter.tokenOf(request));
	}

	@GetMapping("/auth/me")
	public ChipperUser me(@AuthenticationPrincipal ChipperUser user) {
		return user;
	}

	// Changing your password signs out your other devices
	@PutMapping("/auth/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void changePassword(@AuthenticationPrincipal ChipperUser user, @Valid @RequestBody PasswordChange body,
			HttpServletRequest request) {
		var stored = users.findById(user.id()).orElseThrow();
		if (!passwords.matches(body.currentPassword(), stored.passwordHash())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your current password isn't right.");
		}
		users.setPassword(user.id(), passwords.encode(body.newPassword()));
		tokens.revokeOthers(user.id(), TokenFilter.tokenOf(request));
	}

}
