package com.authen.micro.service;


import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.authen.micro.model.TravelRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class MistralService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;


    private final String mistralApiUrl = "https://api.mistral.ai/v1/chat/completions"; // exemple
    private final String apiToken = "4ZwSQdPSQjyWsdCbdfhITIVIEVXot3n7";

    private final String systemPrompt = "You are a travel assistant. Extract originCityCode, destinationCityCode, departureDate, returnDate, adults, and cabin from the user's input. Respond ONLY in JSON format.";

    public MistralService(RestTemplateBuilder builder, ObjectMapper objectMapper) {
        this.restTemplate = builder.build();
        this.objectMapper = objectMapper;
    }

    public TravelRequest extractTravelInfo(String userPrompt) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", "mistral-tiny",
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(mistralApiUrl, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String content = root.path("choices").get(0).path("message").path("content").asText();
                return objectMapper.readValue(content, TravelRequest.class);
            } else {
                throw new RuntimeException("Erreur Mistral : réponse invalide ou vide");
            }

        } catch (Exception e) {
            throw new RuntimeException("Erreur parsing Mistral : " + e.getMessage(), e);
        }
    }
}



//@Service
//public class MistralService {
//
//    private final RestTemplate restTemplate = new RestTemplate();
//    private final ObjectMapper objectMapper = new ObjectMapper();
//
//    private final String mistralApiUrl = "https://api.mistral.ai/v1/chat/completions"; // exemple
//    private final String apiToken = "4ZwSQdPSQjyWsdCbdfhITIVIEVXot3n7"; // Mets ton token ici
//
//    // System prompt qui explique la tâche à Mistral (adapter selon besoin)
//    private final String systemPrompt = "You are a travel information extraction assistant. Extract all necessary travel data from the user's request " +
//            "to be used with the Amadeus API for flights, hotels, and activities. Respond with ONLY a valid JSON object, no explanations.";
//
//    public JsonNode extractTravelInfo(String userPrompt) {
//        try {
//            // Construire le body JSON
//            String requestBody = "{\n" +
//                    "  \"model\": \"mistral-tiny\",\n" +
//                    "  \"messages\": [\n" +
//                    "    {\"role\": \"system\", \"content\": \"" + systemPrompt + "\"},\n" +
//                    "    {\"role\": \"user\", \"content\": \"" + userPrompt + "\"}\n" +
//                    "  ]\n" +
//                    "}";
//
//            HttpHeaders headers = new HttpHeaders();
//            headers.setContentType(MediaType.APPLICATION_JSON);
//            headers.setBearerAuth(apiToken);
//
//            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
//
//            ResponseEntity<String> response = restTemplate.postForEntity(mistralApiUrl, entity, String.class);
//
//            if (response.getStatusCode() == HttpStatus.OK) {
//                // La réponse complète JSON de Mistral
//                String responseBody = response.getBody();
//
//                // Extraire le champ 'content' dans la structure choices[0].message.content
//                JsonNode root = objectMapper.readTree(responseBody);
//                String jsonContent = root.path("choices").get(0).path("message").path("content").asText();
//
//                // Le contenu est une string JSON, on la parse en JsonNode
//                return objectMapper.readTree(jsonContent);
//            } else {
//                throw new RuntimeException("Erreur appel Mistral : " + response.getStatusCode());
//            }
//
//        } catch (Exception e) {
//            throw new RuntimeException("Erreur lors de l'extraction des données de voyage: " + e.getMessage(), e);
//        }
//    }
//}
