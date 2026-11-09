package io.github.leachh02.chipper.auth;

import java.util.List;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Admins add and remove the people who use this server
@RestController
@RequestMapping("/api/users")
public class UserAdminController {

	public record NewUser(
			@NotBlank @Size(max = 64) String username,
			@NotBlank @Size(min = 8, max = 200) String password,
			boolean admin) {
	}

	public record PasswordReset(@NotBlank @Size(min = 8, max = 200) String password) {
	}

	private final UserRepository users;
	private final PasswordEncoder passwords;

	public UserAdminController(UserRepository users, PasswordEncoder passwords) {
		this.users = users;
		this.passwords = passwords;
	}

	@GetMapping
	public List<ChipperUser> list() {
		return users.findAll();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ChipperUser create(@Valid @RequestBody NewUser body) {
		try {
			return users.create(body.username().trim(), passwords.encode(body.password()), body.admin());
		}
		catch (DuplicateKeyException e) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Someone already has that username.");
		}
	}

	@PutMapping("/{id}/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetPassword(@PathVariable long id, @Valid @RequestBody PasswordReset body) {
		users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
		users.setPassword(id, passwords.encode(body.password()));
	}

	// Deletes the account and everything it synced
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@AuthenticationPrincipal ChipperUser me, @PathVariable long id) {
		if (id == me.id()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "You can't delete your own account.");
		}
		users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
		users.delete(id);
	}

}
