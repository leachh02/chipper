package io.github.leachh02.chipper.auth;

// The signed-in user, as controllers see it
public record ChipperUser(long id, String username, boolean admin) {
}
