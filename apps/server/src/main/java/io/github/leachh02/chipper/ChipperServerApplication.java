package io.github.leachh02.chipper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ChipperServerApplication {

	public static void main(String[] args) throws IOException {
		// SQLite creates the database file but not the folder it sits in
		String dataDir = System.getenv().getOrDefault("CHIPPER_DATA_DIR", "data");
		Files.createDirectories(Path.of(dataDir));
		SpringApplication.run(ChipperServerApplication.class, args);
	}

}
