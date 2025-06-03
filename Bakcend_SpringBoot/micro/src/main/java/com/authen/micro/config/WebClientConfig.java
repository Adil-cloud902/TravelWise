package com.authen.micro.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Bean(name = "amadeusWebClient")
    public WebClient amadeusWebClient() {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(30));

        return WebClient.builder()
                .baseUrl("https://test.api.amadeus.com")
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer.defaultCodecs()
                        .maxInMemorySize(2 * 1024 * 1024))
                .build();
    }

    @Bean(name = "amadeusAuthClient")
    public WebClient amadeusAuthClient() {
        return WebClient.builder()
                .baseUrl("https://test.api.amadeus.com")
                .build();
    }
}
