"use strict";

const SPEEDLIMIT_API_URL =
  "https://devweb2024.cis.strath.ac.uk/aes02112-nodejs/speed";
let speedDOM: HTMLElement; // Can't const declare without init :(
let streetDOM: HTMLElement;

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
          streetDOM.textContent = streetPosition.name;
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

//   NOTE:tryParseJSONObject is from WADCW2-JJB22189
//    https://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string
function tryParseJSONObject(jsonString: string) {
  try {
    var o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    console.log("Response recieved not JSON, got: " + jsonString);
  }

  return false;
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

  processGeolocationPermission().then(
    () => {
      // attach listener
      console.log("Got permissions!");
      navigator.geolocation.getCurrentPosition(
        handleGPSInfo,
        (error: GeolocationPositionError) => {
          console.log("Permission granted, but error on get! ", error);
        },
      );
    },
    () => {
      console.log("Failed to get permissions!");
    },
  );
}

document.addEventListener("DOMContentLoaded", init);
