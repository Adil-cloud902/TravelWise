package com.authen.micro.controller;

import com.authen.micro.model.Coordinates;
import com.authen.micro.model.TravelRequest;
import com.authen.micro.service.AmadeusService;
import com.authen.micro.service.MistralService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/travel/ask")
public class TravelController {

    private final MistralService mistralService;
    private final AmadeusService amadeusService;

    public TravelController(MistralService mistralService, AmadeusService amadeusService) {
        this.mistralService = mistralService;
        this.amadeusService = amadeusService;
    }

    @PostMapping("/flight")
    public ResponseEntity<Object> getFlights(@RequestBody Map<String, String> body) {
        try {
            TravelRequest request = mistralService.extractTravelInfo(body.get("text"));
            String flightRaw = amadeusService.searchFlights(
                    request.getOriginCityCode(),
                    request.getDestinationCityCode(),
                    request.getDepartureDate(),
                    request.getReturnDate(),
                    request.getAdults(),
                    request.getCabin()
            ).block();
            JsonNode flights = new ObjectMapper().readTree(flightRaw);
            return ResponseEntity.ok(flights);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la recherche des vols : " + e.getMessage()));
        }
    }

    @PostMapping("/hotel")
    public ResponseEntity<Object> getHotels(@RequestBody Map<String, String> body) {
        try {
            TravelRequest request = mistralService.extractTravelInfo(body.get("text"));
            String hotelRaw = amadeusService.searchHotels(request.getDestinationCityCode()).block();
            JsonNode hotels = new ObjectMapper().readTree(hotelRaw);
            return ResponseEntity.ok(hotels);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la recherche des hôtels : " + e.getMessage()));
        }
    }

    @PostMapping("/activity")
    public ResponseEntity<Object> getActivities(@RequestBody Map<String, String> body) {
        try {
            TravelRequest request = mistralService.extractTravelInfo(body.get("text"));

            Double latitude = request.getLatitude();
            Double longitude = request.getLongitude();
            String startDate = request.getStartDate() != null ? request.getStartDate() : request.getDepartureDate();
            String endDate = request.getEndDate() != null ? request.getEndDate() : request.getReturnDate();

            if ((latitude == null || longitude == null) && request.getDestinationCityCode() != null) {
                Coordinates coords = amadeusService.getCoordinatesFromIata(request.getDestinationCityCode());
                if (coords != null) {
                    latitude = coords.getLatitude();
                    longitude = coords.getLongitude();
                }
            }

            if (latitude == null || longitude == null || startDate == null || endDate == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Coordonnées ou dates manquantes pour les activités."));
            }

            JsonNode activities = amadeusService
                    .searchActivities(latitude, longitude, startDate, endDate)
                    .block();

            return ResponseEntity.ok(activities);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la recherche des activités : " + e.getMessage()));
        }
    }
}
