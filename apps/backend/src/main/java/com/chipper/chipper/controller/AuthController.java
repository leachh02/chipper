package com.chipper.chipper.controller;

import com.chipper.chipper.service.GoogleOAuthService;
import com.chipper.chipper.model.UserToken;
import com.chipper.chipper.repository.UserTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.view.RedirectView;

import java.io.IOException;

@Controller
public class AuthController {

    @Autowired
    private GoogleOAuthService googleOAuthService;

    @Autowired
    private UserTokenRepository tokenRepo;

    @GetMapping("/api/auth/google")
    public RedirectView redirectToGoogle() {
        String googleAuthUrl = googleOAuthService.buildAuthUrl();
        return new RedirectView(googleAuthUrl);
    }

    @GetMapping("/api/auth/google/callback")
    public RedirectView googleCallback(@RequestParam("code") String code) throws IOException, InterruptedException {
        String accessToken = googleOAuthService.exchangeAuthCodeForAccessToken(code);
        String email = googleOAuthService.getUserEmail(accessToken);

        UserToken token = new UserToken();
        token.setProvider("google");
        token.setAccessToken(accessToken);
        token.setEmail(email);

        tokenRepo.save(token);
        return new RedirectView("http://localhost:5173/dashboard");
    }

    @GetMapping("/api/youtube/watchlater")
    @ResponseBody
    public String getWatchLater() throws IOException, InterruptedException {
        // 🔧 Replace this with actual user identification
        String email = "leachh02@gmail.com"; //TODO: replace with dynamic user detection

        UserToken token = tokenRepo.findByEmailAndProvider(email, "google")
                .orElseThrow(() -> new RuntimeException("No token found for this user"));

        return googleOAuthService.fetchWatchLaterVideos(token.getAccessToken());
    }
}