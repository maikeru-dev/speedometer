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
            streetDOM.textContent = streetPosition.name;
        }, (error) => {
            //  FIXME: Improve error handling
            console.log("Something went wrong downloading this", error);
        });
    })
        .catch((error) => {
        console.log("Something went wrong downloading this", error);
    });
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
    processGeolocationPermission().then(() => {
        // attach listener
        console.log("Got permissions!");
        navigator.geolocation.getCurrentPosition(handleGPSInfo, (error) => {
            console.log("Permission granted, but error on get! ", error);
        });
    }, () => {
        console.log("Failed to get permissions!");
    });
}
document.addEventListener("DOMContentLoaded", init);
