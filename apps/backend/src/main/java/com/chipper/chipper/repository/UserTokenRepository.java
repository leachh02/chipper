package com.chipper.chipper.repository;

import com.chipper.chipper.model.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {
    Optional<UserToken> findByEmailAndProvider(String email, String provider);
}