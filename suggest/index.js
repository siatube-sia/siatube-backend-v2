import https from "https";
import {
  createGoogleSuggestHeaders,
  getLocaleOptions,
} from "../shared/youtube-request-config.js";

export function getSuggestions(keyword, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    if (!keyword) {
      const error = new Error("keyword is required");
      error.statusCode = 400;
      reject(error);
      return;
    }

    const locale = getLocaleOptions(requestOptions);
    const options = {
      hostname: "www.google.com",
      path: `/complete/search?client=youtube&hl=${encodeURIComponent(
        locale.hl
      )}&ds=yt&q=${encodeURIComponent(
        keyword
      )}`,
      method: "GET",
      headers: createGoogleSuggestHeaders(requestOptions),
    };

    const request = https.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          const jsonString = data.substring(
            data.indexOf("["),
            data.lastIndexOf("]") + 1
          );

          const suggestionsArray = JSON.parse(jsonString);
          resolve(suggestionsArray[1].map((i) => i[0]));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
}
