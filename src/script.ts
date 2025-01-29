"use strict";

function handleGPSInfo(position: GeolocationPosition) {
  // Handle GPS location updates here
  console.log("handleGPSInfo called");
  position.coords.speed;
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

function init(): void {
  // Do any initialisation here
  // if location allowed
  processGeolocationPermission().then(
    () => {
      // attach listener
      console.log("Got permissions!");
      navigator.geolocation.getCurrentPosition(handleGPSInfo, () => {
        console.log("Permission granted, but error on get!");
      });
    },
    () => {
      console.log("Failed to get permissions!");
    },
  );
}

document.addEventListener("DOMContentLoaded", init);
