package com.authen.micro.model;





public class TravelRequest {
    private String originCityCode;
    private String destinationCityCode;
    private String departureDate;
    private String returnDate;
    private int adults;
    private String cabin;

    private Double latitude;
    private Double longitude;
    private String startDate;
    private String endDate;

    // Getters et setters

    public String getOriginCityCode() {
        return originCityCode;
    }

    public void setOriginCityCode(String originCityCode) {
        this.originCityCode = originCityCode;
    }

    public String getDestinationCityCode() {
        return destinationCityCode;
    }

    public void setDestinationCityCode(String destinationCityCode) {
        this.destinationCityCode = destinationCityCode;
    }

    public String getDepartureDate() {
        return departureDate;
    }

    public void setDepartureDate(String departureDate) {
        this.departureDate = departureDate;
    }

    public String getReturnDate() {
        return returnDate;
    }

    public void setReturnDate(String returnDate) {
        this.returnDate = returnDate;
    }

    public int getAdults() {
        return adults;
    }

    public void setAdults(int adults) {
        this.adults = adults;
    }

    public String getCabin() {
        return cabin;
    }

    public void setCabin(String cabin) {
        this.cabin = cabin;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }
}