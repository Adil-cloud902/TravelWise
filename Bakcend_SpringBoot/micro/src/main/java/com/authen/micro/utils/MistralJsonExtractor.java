package com.authen.micro.utils;

import org.json.JSONException;
import org.json.JSONObject;

public class MistralJsonExtractor {

    public static String extractJsonFromMistral(String mistralResponse) throws JSONException {
        JSONObject fullResponse = new JSONObject(mistralResponse);
        return fullResponse
                .getJSONArray("choices")
                .getJSONObject(0)
                .getJSONObject("message")
                .getString("content");
    }
}