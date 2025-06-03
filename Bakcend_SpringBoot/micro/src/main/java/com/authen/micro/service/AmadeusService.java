package com.authen.micro.service;


import com.authen.micro.model.Coordinates;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;


@Service
public class AmadeusService {

    private static final Logger log = LoggerFactory.getLogger(AmadeusService.class);

    private final String clientId = "13fSclfWk9JEfJAEddiMnSw2m2HAegtS";
    private final String clientSecret = "8dserRIBZfEA6HWo";

    private final WebClient authClient;
    private final WebClient webClient;

    private String accessToken;
    private LocalDateTime tokenExpiration;

    public AmadeusService(@Qualifier("amadeusAuthClient") WebClient authClient,
                          @Qualifier("amadeusWebClient") WebClient webClient) {
        this.authClient = authClient;
        this.webClient = webClient;
    }

    @PostConstruct
    public void init() {
        authenticate().subscribe();
    }

    public Mono<Void> authenticate() {
        log.info("Authentification à l'API Amadeus");
        return authClient.post()
                .uri("/v1/security/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .bodyValue("grant_type=client_credentials&client_id=" + clientId + "&client_secret=" + clientSecret)
                .retrieve()
                .bodyToMono(String.class)
                .doOnNext(response -> {
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode node = mapper.readTree(response);
                        this.accessToken = node.get("access_token").asText();
                        int expiresIn = node.get("expires_in").asInt();
                        this.tokenExpiration = LocalDateTime.now().plusSeconds(expiresIn - 60);
                        log.info("Token Amadeus obtenu, expire dans {} secondes", expiresIn);
                    } catch (Exception e) {
                        log.error("Erreur parsing token Amadeus", e);
                        throw new RuntimeException("Erreur parsing token Amadeus", e);
                    }
                })
                .then();
    }

    private boolean isTokenExpired() {
        return accessToken == null || tokenExpiration == null || LocalDateTime.now().isAfter(tokenExpiration);
    }

    public Mono<String> searchFlights(String origin, String destination, String departureDate, String returnDate, Integer adults, String cabin) {
        log.info("Recherche vols: {} -> {}, départ: {}, retour: {}, adultes: {}, classe: {}",
                origin, destination, departureDate, returnDate, adults, cabin);

        if (isTokenExpired()) {
            log.info("Token expiré ou manquant, réauthentification...");
            return authenticate().then(makeFlightSearchRequest(origin, destination, departureDate, returnDate, adults, cabin));
        } else {
            return makeFlightSearchRequest(origin, destination, departureDate, returnDate, adults, cabin);
        }
    }

    private Mono<String> makeFlightSearchRequest(String origin, String destination, String departureDate, String returnDate, Integer adults, String cabin) {
        adults = (adults != null) ? adults : 1;
        cabin = (cabin != null && !cabin.isEmpty()) ? cabin.toUpperCase() : "ECONOMY";

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromPath("/v2/shopping/flight-offers")
                .queryParam("originLocationCode", origin)
                .queryParam("destinationLocationCode", destination)
                .queryParam("departureDate", departureDate)
                .queryParam("adults", adults)
                .queryParam("nonStop", false)
                .queryParam("currencyCode", "USD")
                .queryParam("max", 5)
                .queryParam("travelClass", cabin);

        if (returnDate != null && !returnDate.isEmpty()) {
            uriBuilder.queryParam("returnDate", returnDate);
        }

        String finalUri = uriBuilder.build().toString();
        log.info("URI recherche vols: {}", finalUri);

        return webClient.get()
                .uri(finalUri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        response.bodyToMono(String.class).flatMap(body -> {
                            log.error("Erreur 4xx API Amadeus: {}", body);
                            return Mono.error(new RuntimeException("Erreur API Amadeus: " + body));
                        })
                )
                .onStatus(status -> status.is5xxServerError(), response ->
                        response.bodyToMono(String.class).flatMap(body -> {
                            log.error("Erreur 5xx serveur Amadeus: {}", body);
                            return Mono.error(new RuntimeException("Erreur serveur Amadeus: " + body));
                        })
                )
                .bodyToMono(String.class)
                .doOnSuccess(res -> log.info("Recherche vols réussie"))
                .doOnError(e -> log.error("Échec recherche vols", e));
    }

    public Mono<String> searchHotels(String cityCode) {
        if (isTokenExpired()) {
            log.info("Token expiré ou manquant, réauthentification...");
            return authenticate().then(makeHotelSearchRequest(cityCode));
        } else {
            return makeHotelSearchRequest(cityCode);
        }
    }

    private Mono<String> makeHotelSearchRequest(String cityCode) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/reference-data/locations/hotels/by-city")
                        .queryParam("cityCode", cityCode)
                        .queryParam("radius", 30)
                        .queryParam("radiusUnit", "KM")
                        .queryParam("hotelSource", "ALL")
                        .build())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(String.class);
    }

    public Mono<JsonNode> searchActivities(double latitude, double longitude, String startDate, String endDate) {
        if (isTokenExpired()) {
            log.info("Token expiré ou manquant, réauthentification...");
            return authenticate().then(makeActivitiesRequest(latitude, longitude, startDate, endDate));
        } else {
            return makeActivitiesRequest(latitude, longitude, startDate, endDate);
        }
    }

    private Mono<JsonNode> makeActivitiesRequest(double latitude, double longitude, String startDate, String endDate) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromPath("/v1/shopping/activities")
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("startDate", startDate)
                .queryParam("endDate", endDate);

        String finalUri = uriBuilder.build().toString();
        log.info("URI recherche activités: {}", finalUri);

        return webClient.get()
                .uri(finalUri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(String.class)  // On récupère d'abord la chaîne JSON
                .map(responseString -> {
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        return mapper.readTree(responseString); // On parse en JsonNode
                    } catch (Exception e) {
                        log.error("Erreur parsing JSON activités", e);
                        throw new RuntimeException(e);
                    }
                });
    }


    public Coordinates getCoordinatesFromIata(String iataCode) {
        String endpoint = "/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=" + iataCode;

        try {
            Map<String, Object> response = webClient.get()
                    .uri(endpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("data")) {
                List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
                if (!dataList.isEmpty()) {
                    Map<String, Object> geoCode = (Map<String, Object>) dataList.get(0).get("geoCode");
                    double lat = ((Number) geoCode.get("latitude")).doubleValue();
                    double lon = ((Number) geoCode.get("longitude")).doubleValue();
                    return new Coordinates(lat, lon);
                }
            }
        } catch (Exception e) {
            log.error("Erreur getCoordinatesFromIata: {}", e.getMessage());
        }

        return null;
    }

}