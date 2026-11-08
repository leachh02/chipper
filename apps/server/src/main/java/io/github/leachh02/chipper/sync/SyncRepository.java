package io.github.leachh02.chipper.sync;

import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Repository
public class SyncRepository {

	// Events only ever get added, so they can't clash
	private static final String APPEND_ONLY = "event";

	public record SyncRecord(String kind, String id, JsonNode data, long revision) {
	}

	public record Incoming(String kind, String id, JsonNode data) {
	}

	public sealed interface PushResult {
		record Accepted(long revision) implements PushResult {
		}

		// Another device changed these since the pusher last pulled. Nothing
		// was saved; the pusher should pull, merge and push again.
		record Conflict(long revision, List<String> records) implements PushResult {
		}
	}

	private final JdbcClient jdbc;
	private final ObjectMapper json;

	public SyncRepository(JdbcClient jdbc, ObjectMapper json) {
		this.jdbc = jdbc;
		this.json = json;
	}

	public long revision(long userId) {
		return jdbc.sql("SELECT revision FROM users WHERE id = ?").param(userId).query(Long.class).single();
	}

	public List<SyncRecord> changedSince(long userId, long since) {
		return jdbc.sql("""
				SELECT kind, id, data, revision FROM records
				WHERE user_id = ? AND revision > ?
				ORDER BY revision""")
			.params(userId, since)
			.query((rs, row) -> new SyncRecord(rs.getString("kind"), rs.getString("id"),
					json.readTree(rs.getString("data")), rs.getLong("revision")))
			.list();
	}

	@Transactional
	public PushResult push(long userId, long base, List<Incoming> records) {
		long current = revision(userId);

		List<String> conflicts = new ArrayList<>();
		if (current > base) {
			for (Incoming r : records) {
				if (r.kind().equals(APPEND_ONLY)) {
					continue;
				}
				Long stored = jdbc.sql("SELECT revision FROM records WHERE user_id = ? AND kind = ? AND id = ?")
					.params(userId, r.kind(), r.id())
					.query(Long.class)
					.optional()
					.orElse(0L);
				if (stored > base) {
					conflicts.add(r.kind() + ":" + r.id());
				}
			}
		}
		if (!conflicts.isEmpty()) {
			return new PushResult.Conflict(current, conflicts);
		}

		long next = current + 1;
		for (Incoming r : records) {
			jdbc.sql("""
					INSERT INTO records (user_id, kind, id, data, revision) VALUES (?, ?, ?, ?, ?)
					ON CONFLICT (user_id, kind, id) DO UPDATE SET data = excluded.data, revision = excluded.revision""")
				.params(userId, r.kind(), r.id(), json.writeValueAsString(r.data()), next)
				.update();
		}
		jdbc.sql("UPDATE users SET revision = ? WHERE id = ?").params(next, userId).update();
		return new PushResult.Accepted(next);
	}

}
