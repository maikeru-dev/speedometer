"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const SPEEDLIMIT_API_URL = "https://devweb2024.cis.strath.ac.uk/aes02112-nodejs/speed";
let speedDOM; // Can't const declare without init :(
let streetDOM;
let speedLimitTextDOM;
let speedLimitSignDOM;
let closeBurgerDOM;
let hamburgerDOM;
let mainPageDOM;
let settingsDOM;
function handleGPSInfo(position) {
    // Handle GPS location updates here
    console.log(`handleGPSInfo called ${position.coords.speed}`);
    let speed = Math.round(position.coords.speed);
    let streetPosition;
    speedDOM.textContent = speed.toString();
    fetchSpeedLimitAPI(position)
        .then((resp) => {
        resp.json().then((json) => {
            streetPosition = json;
            console.log(json);
            updateStreetInformation(streetPosition);
        }, (error) => {
            //  FIXME: Improve error handling
            console.log("Something went wrong downloading this", error);
        });
    })
        .catch((error) => {
        console.log("Something went wrong downloading this", error);
    });
}
function updateStreetInformation(streetInfo) {
    console.log("Street info: ", streetInfo);
    if (streetInfo.status != "OK") {
        // ATM, do nothing
        // speedLimitSign.style.opacity = "0";
        console.log("Street information is empty.");
        return;
    }
    streetDOM.textContent = streetInfo.name;
    speedLimitSignDOM.style.opacity = "100";
    //  FIXME: This needs to respect settings, this should change based on whether the user wants it to.
    speedLimitTextDOM.textContent = streetInfo.localSpeedLimit.toString();
}
// https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus/change_event
function processGeolocationPermission() {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield navigator.permissions.query({
            name: "geolocation",
        });
        console.log(`Geolocation state: ${result.state}`);
        if (result.state == "granted") {
            return true;
        }
        else if (result.state == "denied") {
            return false;
        }
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
            // User may not click "always allow", in this case the permission status does not change.
            () => {
                resolve(true);
            }, () => {
                resolve(false);
            }); // Trigger a prompt
            result.onchange = () => {
                // When user checks the "always allow" box in the prompt, this block will run regardless of their choice.
                console.log(`Geolocation state permanently updated: ${result.state}`);
                if (result.state == "granted") {
                    resolve(true);
                }
                else if (result.state == "denied") {
                    reject(false);
                }
                else {
                    console.log("Something went wrong! See processGeolocationPermission");
                    reject(false);
                }
            };
        });
    });
}
function generatePositionString(position) {
    return `lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
}
function fetchSpeedLimitAPI(position) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetch(SPEEDLIMIT_API_URL + "?" + generatePositionString(position), {
            mode: "cors",
        });
    });
}
function init() {
    // Do any initialisation here
    speedDOM = document.getElementById("speed");
    streetDOM = document.getElementById("street");
    speedLimitSignDOM = document.getElementById("speedLimitSign");
    speedLimitTextDOM = document.getElementById("speedLimitText");
    closeBurgerDOM = document.getElementById("closeBurger");
    hamburgerDOM = document.getElementById("openHamburger");
    settingsDOM = document.getElementById("settings");
    mainPageDOM = document.getElementById("mainPage");
    if (window.screen.width <= 600) {
        openSettings();
    }
    processGeolocationPermission().then(() => {
        // attach listener
        console.log("Got permissions!");
        navigator.geolocation.watchPosition(handleGPSInfo, (error) => {
            console.log("Permission granted, but error on get! ", error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        });
    }, () => {
        console.log("Failed to get permissions!");
    });
}
function openSettings() {
    hamburgerDOM.style.display = "none";
    closeBurgerDOM.style.display = "block";
    mainPageDOM.style.display = "none";
    settingsDOM.style.display = "flex";
}
function closeSettings() {
    hamburgerDOM.style.display = "block";
    closeBurgerDOM.style.display = "none";
    mainPageDOM.style.display = "block";
    settingsDOM.style.display = "none";
}
function isSettingsVisible() {
    if (!(hamburgerDOM && closeBurgerDOM)) {
        return null;
    }
    let hamburgerStyle = hamburgerDOM.style.display;
    let closeBurgerStyle = closeBurgerDOM.style.display;
    if (hamburgerStyle != "none" && closeBurgerStyle == "none") {
        return false;
    }
    if (hamburgerStyle == "none" && closeBurgerStyle != "none") {
        return true;
    }
    console.error("Found possibly hamburgerStyle == closeBurgerStyle");
    return null; // Something weird happened.
}
document.addEventListener("DOMContentLoaded", init);
