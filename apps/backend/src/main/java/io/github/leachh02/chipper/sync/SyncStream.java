package io.github.leachh02.chipper.sync;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

// Tells a user's other open devices when there's something new to pull
@Component
public class SyncStream {

	// Devices reconnect when the stream ends, so it never runs forever
	private static final Duration LIFETIME = Duration.ofMinutes(30);

	private final Map<Long, Set<SseEmitter>> listeners = new ConcurrentHashMap<>();

	public SseEmitter open(long userId, long revision) {
		SseEmitter emitter = new SseEmitter(LIFETIME.toMillis());
		Set<SseEmitter> mine = listeners.computeIfAbsent(userId, id -> new CopyOnWriteArraySet<>());
		mine.add(emitter);
		Runnable remove = () -> mine.remove(emitter);
		emitter.onCompletion(remove);
		emitter.onTimeout(remove);
		emitter.onError(e -> remove.run());
		// Covers anything pushed while this device was offline
		send(emitter, revision);
		return emitter;
	}

	public void changed(long userId, long revision) {
		listeners.getOrDefault(userId, Set.of()).forEach(emitter -> send(emitter, revision));
	}

	// Some proxies close a connection that's quiet for a minute
	@Scheduled(fixedRate = 25_000)
	void keepAlive() {
		listeners.values().forEach(set -> set.forEach(emitter -> {
			try {
				emitter.send(SseEmitter.event().comment("ping"));
			}
			catch (IOException | IllegalStateException e) {
				set.remove(emitter);
			}
		}));
	}

	private static void send(SseEmitter emitter, long revision) {
		try {
			emitter.send(SseEmitter.event().name("changed").data(revision));
		}
		catch (IOException | IllegalStateException e) {
			emitter.completeWithError(e);
		}
	}

}
