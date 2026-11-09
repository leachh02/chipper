package io.github.leachh02.chipper.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, TokenService tokens) throws Exception {
		http
			// Tokens travel in a header rather than a cookie, so there's no
			// cross-site request to forge
			.csrf(csrf -> csrf.disable())
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(f -> f.disable())
			.httpBasic(b -> b.disable())
			.logout(l -> l.disable())
			.exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
			.addFilterBefore(new TokenFilter(tokens), UsernamePasswordAuthenticationFilter.class)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/api/status", "/api/auth/setup", "/api/auth/login").permitAll()
				.requestMatchers("/api/users/**").hasRole("ADMIN")
				.requestMatchers("/api/**").authenticated()
				// The app itself, and the Docker health check
				.anyRequest().permitAll());
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	// Sign-in goes through TokenService. Declaring this stops Spring Boot
	// creating a default user with a generated password.
	@Bean
	UserDetailsService noUserDetails() {
		return username -> {
			throw new UsernameNotFoundException(username);
		};
	}

}
