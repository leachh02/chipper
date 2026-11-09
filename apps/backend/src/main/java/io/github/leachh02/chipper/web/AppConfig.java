package io.github.leachh02.chipper.web;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

// Serves the Chipper app. Its pages (/queue, /dashboard/youtube, ...) are
// handled in the browser, so any path that isn't a file gets index.html.
@Configuration
public class AppConfig implements WebMvcConfigurer {

	private final String appDir;

	public AppConfig(@Value("${chipper.app-dir}") String appDir) {
		this.appDir = appDir.endsWith("/") ? appDir : appDir + "/";
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/**")
			.addResourceLocations(appDir)
			.resourceChain(true)
			.addResolver(new PathResourceResolver() {
				@Override
				protected Resource getResource(String path, Resource location) throws IOException {
					Resource file = location.createRelative(path);
					if (file.exists() && file.isReadable()) {
						return file;
					}
					// A missing API route or file should 404, not load the app
					if (path.startsWith("api/") || path.contains(".")) {
						return null;
					}
					Resource index = location.createRelative("index.html");
					return index.exists() ? index : null;
				}
			});
	}

}
