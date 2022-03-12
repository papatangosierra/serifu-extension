// This is where we're going to create components that listen and respond to keyboard events.

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { testData } from "./test-data.js";
import { theDoc } from "../app.jsx";
import {
  csInterface,
  currentDisplayPage,
  registerPageCheck,
  unRegisterPageCheck,
  placeLineInINDDTextFrame,
  clearINDDSelection,
} from "../interface.js";

