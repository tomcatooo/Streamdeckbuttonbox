import streamDeck from "@elgato/streamdeck";
import { TelemetryButtonAction } from "./actions/telemetry-button";
import { SimHubClient } from "./simhub-client";

const simhub = new SimHubClient();
simhub.start();

streamDeck.actions.registerAction(new TelemetryButtonAction(simhub));

await streamDeck.connect();
