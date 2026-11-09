package io.github.leachh02.chipper.auth;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

	public record StoredUser(long id, String username, String passwordHash, boolean admin) {
		public ChipperUser toUser() {
			return new ChipperUser(id, username, admin);
		}
	}

	private final JdbcClient jdbc;

	public UserRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	public boolean isEmpty() {
		return jdbc.sql("SELECT COUNT(*) FROM users").query(Long.class).single() == 0;
	}

	public Optional<StoredUser> findByUsername(String username) {
		return jdbc.sql("SELECT id, username, password_hash, admin FROM users WHERE username = ?")
			.param(username)
			.query(StoredUser.class)
			.optional();
	}

	public Optional<StoredUser> findById(long id) {
		return jdbc.sql("SELECT id, username, password_hash, admin FROM users WHERE id = ?")
			.param(id)
			.query(StoredUser.class)
			.optional();
	}

	public List<ChipperUser> findAll() {
		return jdbc.sql("SELECT id, username, admin FROM users ORDER BY username")
			.query(ChipperUser.class)
			.list();
	}

	public ChipperUser create(String username, String passwordHash, boolean admin) {
		var keys = new GeneratedKeyHolder();
		jdbc.sql("INSERT INTO users (username, password_hash, admin, created_at) VALUES (?, ?, ?, ?)")
			.params(username, passwordHash, admin, System.currentTimeMillis())
			.update(keys, "id");
		return new ChipperUser(keys.getKey().longValue(), username, admin);
	}

	public void setPassword(long id, String passwordHash) {
		jdbc.sql("UPDATE users SET password_hash = ? WHERE id = ?").params(passwordHash, id).update();
	}

	public void delete(long id) {
		jdbc.sql("DELETE FROM users WHERE id = ?").param(id).update();
	}

}
