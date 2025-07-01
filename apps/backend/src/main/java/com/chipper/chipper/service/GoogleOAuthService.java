package com.chipper.chipper.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

@Service
public class GoogleOAuthService {

    @Value("${GOOGLE_CLIENT_ID}")
    private String clientId;

    @Value("${GOOGLE_CLIENT_SECRET}")
    private String clientSecret;

    @Value("${google.redirect.uri}")
    private String redirectUri;

    private final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private final String TOKEN_URL = "https://oauth2.googleapis.com/token";

    public String buildAuthUrl() {
        String scope = URLEncoder.encode("email profile openid https://www.googleapis.com/auth/youtube.readonly",
                StandardCharsets.UTF_8);
        return AUTH_URL +
                "?client_id=" + clientId +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                "&response_type=code" +
                "&scope=" + scope +
                "&access_type=offline" +
                "&prompt=consent";
    }

    public String exchangeAuthCodeForAccessToken(String code) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        String body = "code=" + code +
                "&client_id=" + clientId +
                "&client_secret=" + clientSecret +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                "&grant_type=authorization_code";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to exchange auth code: " + response.body());
        }

        JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
        return json.get("access_token").getAsString();
    }

    public String getUserEmail(String accessToken) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to fetch user info: " + response.body());
        }

        JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
        return json.get("email").getAsString();
    }

    public String fetchWatchLaterVideos(String accessToken) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        // const
        // temp="https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=WL"
        String API_URL = "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("🔗YT WL: " + response);

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to fetch watch later videos: " + response.body());
        }

        return response.body();
    }

}