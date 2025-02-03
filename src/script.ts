"use strict";

import "settings";

const SPEEDLIMIT_API_URL =
  "https://devweb2024.cis.strath.ac.uk/aes02112-nodejs/speed";
let speedDOM: HTMLElement; // Can't const declare without init :(
let streetDOM: HTMLElement;
let speedLimitTextDOM: HTMLElement;
let speedLimitSignDOM: HTMLElement;

interface StreetPosition {
  copyright: string;
  warning: string;
  localSpeedLimit: number;
  localSpeedUnit: string;
  siSpeed: number;
  name: string;
  status: string;
  lat: string;
  lon: string;
  cached: boolean;
}

function handleGPSInfo(position: GeolocationPosition): void {
  // Handle GPS location updates here
  console.log(`handleGPSInfo called ${position.coords.speed}`);

  let speed: number = Math.round(position.coords.speed!);
  let streetPosition: StreetPosition;
  speedDOM.textContent = speed.toString();

  fetchSpeedLimitAPI(position)
    .then((resp) => {
      resp.json().then(
        (json) => {
          streetPosition = json as StreetPosition;
          console.log(json);
          updateStreetInformation(streetPosition);
        },
        (error) => {
          //  FIXME: Improve error handling
          console.log("Something went wrong downloading this", error);
        },
      );
    })
    .catch((error) => {
      console.log("Something went wrong downloading this", error);
    });
}

function updateStreetInformation(streetInfo: StreetPosition): void {
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
async function processGeolocationPermission(): Promise<boolean> {
  let result: PermissionStatus = await navigator.permissions.query({
    name: "geolocation",
  });

  console.log(`Geolocation state: ${result.state}`);
  if (result.state == "granted") {
    return true;
  } else if (result.state == "denied") {
    return false;
  }

  return new Promise<boolean>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      // User may not click "always allow", in this case the permission status does not change.
      () => {
        resolve(true);
      },
      () => {
        resolve(false);
      },
    ); // Trigger a prompt

    result.onchange = () => {
      // When user checks the "always allow" box in the prompt, this block will run regardless of their choice.
      console.log(`Geolocation state permanently updated: ${result.state}`);
      if (result.state == "granted") {
        resolve(true);
      } else if (result.state == "denied") {
        reject(false);
      } else {
        console.log("Something went wrong! See processGeolocationPermission");
        reject(false);
      }
    };
  });
}

function generatePositionString(position: GeolocationPosition): string {
  return `lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
}

async function fetchSpeedLimitAPI(
  position: GeolocationPosition,
): Promise<Response> {
  return fetch(SPEEDLIMIT_API_URL + "?" + generatePositionString(position), {
    mode: "cors",
  });
}

function init(): void {
  // Do any initialisation here
  speedDOM = document.getElementById("speed")!;
  streetDOM = document.getElementById("street")!;
  speedLimitSignDOM = document.getElementById("speedLimitSign")!;
  speedLimitTextDOM = document.getElementById("speedLimitText")!;

  processGeolocationPermission().then(
    () => {
      // attach listener
      console.log("Got permissions!");
      navigator.geolocation.watchPosition(
        handleGPSInfo,
        (error: GeolocationPositionError) => {
          console.log("Permission granted, but error on get! ", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    },
    () => {
      console.log("Failed to get permissions!");
    },
  );
}

document.addEventListener("DOMContentLoaded", init);
