package io.github.leachh02.chipper.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

// Each signed-in device holds a random token. The server keeps only its
// SHA-256 hash, so a copy of the database can't be used to sign in.
@Service
public class TokenService {

	private static final SecureRandom RANDOM = new SecureRandom();

	private final JdbcClient jdbc;

	public TokenService(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	public String issue(long userId, String device) {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		long now = System.currentTimeMillis();
		jdbc.sql("INSERT INTO tokens (hash, user_id, device, created_at, last_used_at) VALUES (?, ?, ?, ?, ?)")
			.params(hash(token), userId, device, now, now)
			.update();
		return token;
	}

	public Optional<ChipperUser> authenticate(String token) {
		String hash = hash(token);
		Optional<ChipperUser> user = jdbc.sql("""
				SELECT u.id, u.username, u.admin FROM tokens t
				JOIN users u ON u.id = t.user_id
				WHERE t.hash = ?""")
			.param(hash)
			.query(ChipperUser.class)
			.optional();
		user.ifPresent(u -> jdbc.sql("UPDATE tokens SET last_used_at = ? WHERE hash = ?")
			.params(System.currentTimeMillis(), hash)
			.update());
		return user;
	}

	public void revoke(String token) {
		jdbc.sql("DELETE FROM tokens WHERE hash = ?").param(hash(token)).update();
	}

	// Signs out every device but the one making the change
	public void revokeOthers(long userId, String keep) {
		jdbc.sql("DELETE FROM tokens WHERE user_id = ? AND hash <> ?").params(userId, hash(keep)).update();
	}

	private static String hash(String token) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
