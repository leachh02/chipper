package io.github.leachh02.chipper.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Signs the request in from an "Authorization: Bearer <token>" header
public class TokenFilter extends OncePerRequestFilter {

	private static final String PREFIX = "Bearer ";

	private final TokenService tokens;

	public TokenFilter(TokenService tokens) {
		this.tokens = tokens;
	}

	public static String tokenOf(HttpServletRequest request) {
		String header = request.getHeader("Authorization");
		return header != null && header.startsWith(PREFIX) ? header.substring(PREFIX.length()) : null;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String token = tokenOf(request);
		if (token != null) {
			tokens.authenticate(token).ifPresent(user -> {
				var authorities = user.admin()
						? List.of(new SimpleGrantedAuthority("ROLE_USER"), new SimpleGrantedAuthority("ROLE_ADMIN"))
						: List.of(new SimpleGrantedAuthority("ROLE_USER"));
				SecurityContextHolder.getContext()
					.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, authorities));
			});
		}
		chain.doFilter(request, response);
	}

}
