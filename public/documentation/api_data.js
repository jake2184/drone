define({ "api": [
  {
    "type": "delete",
    "url": "/audio/:docID",
    "title": "Delete audio from database",
    "name": "DeleteAudio",
    "group": "Audio",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the audio file to be deleted</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Audio"
  },
  {
    "type": "delete",
    "url": "/audio/:docID",
    "title": "Delete audio from database",
    "name": "DeleteAudio",
    "group": "Audio",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the audio file to be deleted</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Audio"
  },
  {
    "type": "get",
    "url": "/audio/:docID",
    "title": "Request single audio file",
    "name": "GetAudio",
    "group": "Audio",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the requested audio file</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "WAV/MP3",
            "optional": false,
            "field": "File",
            "description": "<p>Audio file requested</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Audio",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "404",
            "optional": false,
            "field": "DocumentNotFound",
            "description": "<p>Document was not located in database</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/audio/:docID",
    "title": "Request single audio file",
    "name": "GetAudio",
    "group": "Audio",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the requested audio file</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "WAV/MP3",
            "optional": false,
            "field": "File",
            "description": "<p>Audio file requested</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Audio",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "404",
            "optional": false,
            "field": "DocumentNotFound",
            "description": "<p>Document was not located in database</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/audio",
    "title": "Request list of audio files in database",
    "name": "GetAudioMeta",
    "group": "Audio",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "List",
            "description": "<p>of all documents within the audio database</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest\n// TODO the return type"
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Audio"
  },
  {
    "type": "get",
    "url": "/audio",
    "title": "Request list of audio files in database",
    "name": "GetAudioMeta",
    "group": "Audio",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "List",
            "description": "<p>of all documents within the audio database</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest\n// TODO the return type"
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Audio"
  },
  {
    "type": "post",
    "url": "/audio/:docID",
    "title": "Upload audio file",
    "name": "PostAudio",
    "group": "Audio",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the audio file to be uploaded</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "User",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Audio",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/audio/:docID",
    "title": "Upload audio file",
    "name": "PostAudio",
    "group": "Audio",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the audio file to be uploaded</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "User",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Audio",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/gps",
    "title": "Request all GPS information",
    "name": "GetGPS",
    "group": "GPS",
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "GPS",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all GPS readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "altitude",
            "optional": false,
            "field": "readings.altitude",
            "description": "<p>Altitude</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/gps",
    "title": "Request all GPS information",
    "name": "GetGPS",
    "group": "GPS",
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "GPS",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all GPS readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "altitude",
            "optional": false,
            "field": "readings.altitude",
            "description": "<p>Altitude</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/gps/:timeFrom",
    "title": "Request GPS information from a given time",
    "name": "GetGPSFrom",
    "group": "GPS",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "GPS",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all GPS readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "altitude",
            "optional": false,
            "field": "readings.altitude",
            "description": "<p>Altitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/gps/:timeFrom",
    "title": "Request GPS information from a given time",
    "name": "GetGPSFrom",
    "group": "GPS",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "GPS",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all GPS readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "altitude",
            "optional": false,
            "field": "readings.altitude",
            "description": "<p>Altitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/gps/:timeFrom/:timeTill",
    "title": "Request GPS data from time range",
    "name": "GetGPSFromTill",
    "group": "GPS",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeTill",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "GPS",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all GPS readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "altitude",
            "optional": false,
            "field": "readings.altitude",
            "description": "<p>Altitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/gps/:timeFrom/:timeTill",
    "title": "Request GPS data from time range",
    "name": "GetGPSFromTill",
    "group": "GPS",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeTill",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "GPS",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all GPS readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "altitude",
            "optional": false,
            "field": "readings.altitude",
            "description": "<p>Altitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "delete",
    "url": "/images/:docID",
    "title": "Delete image from database",
    "name": "DeleteImages",
    "group": "Images",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the image to be deleted</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Images"
  },
  {
    "type": "delete",
    "url": "/images/:docID",
    "title": "Delete image from database",
    "name": "DeleteImages",
    "group": "Images",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the image to be deleted</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Images"
  },
  {
    "type": "get",
    "url": "/images/:docID",
    "title": "Request single image",
    "name": "GetImage",
    "group": "Images",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the requested image</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "JPEG",
            "optional": false,
            "field": "File",
            "description": "<p>Image file requested</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Images",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "404",
            "optional": false,
            "field": "DocumentNotFound",
            "description": "<p>Document was not located in database</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/images/:docID",
    "title": "Request single image",
    "name": "GetImage",
    "group": "Images",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the requested image</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "JPEG",
            "optional": false,
            "field": "File",
            "description": "<p>Image file requested</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Images",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "404",
            "optional": false,
            "field": "DocumentNotFound",
            "description": "<p>Document was not located in database</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/images",
    "title": "Get list of images",
    "name": "GetImageMeta",
    "group": "Images",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "List",
            "description": "<p>of all documents within the image database</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest\n// TODO the return type"
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Images"
  },
  {
    "type": "get",
    "url": "/images",
    "title": "Get list of images",
    "name": "GetImageMeta",
    "group": "Images",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "List",
            "description": "<p>of all documents within the image database</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest\n// TODO the return type"
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Images"
  },
  {
    "type": "post",
    "url": "/images/:docID",
    "title": "Upload image to functions.cloudant.server",
    "name": "PostImage",
    "group": "Images",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the image to be uploaded</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "User",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Images",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/images/:docID",
    "title": "Upload image to functions.cloudant.server",
    "name": "PostImage",
    "group": "Images",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "docID",
            "description": "<p>The docID of the image to be uploaded</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "User",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Images",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors",
    "title": "Request all sensor information",
    "name": "GetSensors",
    "group": "Sensors",
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors",
    "title": "Request all sensor information",
    "name": "GetSensors",
    "group": "Sensors",
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors/:timeFrom",
    "title": "Request sensor data from a given time",
    "name": "GetSensorsFrom",
    "group": "Sensors",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors/:timeFrom",
    "title": "Request sensor data from a given time",
    "name": "GetSensorsFrom",
    "group": "Sensors",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors/:timeFrom/:timeUntil",
    "title": "Request sensor data from a time range",
    "name": "GetSensorsFromTill",
    "group": "Sensors",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeUntil",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors/:timeFrom/:timeUntil",
    "title": "Request sensor data from a time range",
    "name": "GetSensorsFromTill",
    "group": "Sensors",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeUntil",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors/:timeFrom/:timeUntil/:type",
    "title": "Request sensor date from a time range of a given type",
    "name": "GetSensorsFromTillType",
    "group": "Sensors",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeUntil",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "type",
            "description": "<p>The type of sensor data to be retrieved</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/sensors/:timeFrom/:timeUntil/:type",
    "title": "Request sensor date from a time range of a given type",
    "name": "GetSensorsFromTillType",
    "group": "Sensors",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeFrom",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "timeUntil",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "type",
            "description": "<p>The type of sensor data to be retrieved</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Guest",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Sensors",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "readings",
            "description": "<p>List of all sensor readings</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "readings.time",
            "description": "<p>Timestamp in milliseconds since epoch</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[2]",
            "optional": false,
            "field": "readings.location",
            "description": "<p>Array containing latitude and longitude</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "NotANumber",
            "description": "<p>The provided <code>timeFrom</code> or <code>timeTill</code> is not a number</p>"
          }
        ]
      }
    }
  },
  {
    "type": "delete",
    "url": "/users/:username",
    "title": "Delete user from the database",
    "name": "DeleteUser",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "Success",
            "description": "<p>Success message</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "UserNotFound",
            "description": "<p>The &lt;code&gt;username&lt;/code&gt; was not found</p>"
          },
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Admin",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Users"
  },
  {
    "type": "delete",
    "url": "/users/:username",
    "title": "Delete user from the database",
    "name": "DeleteUser",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "Success",
            "description": "<p>Success message</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Admin",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Users",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "UserNotFound",
            "description": "<p>The <code>username</code> was not found</p>"
          },
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/users/:username",
    "title": "Get details of user",
    "name": "GetUser",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "user",
            "description": "<p>Details of the user requested</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "user.username",
            "description": "<p>Username</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "user.first_name",
            "description": "<p>First Name</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "user.last_name",
            "description": "<p>Last Name</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "user.role",
            "description": "<p>Role of the user, used to restrict API access</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Admin",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Users",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "UserNotFound",
            "description": "<p>The <code>username</code> was not found</p>"
          },
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/users/:username",
    "title": "Get details of user",
    "name": "GetUser",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "user",
            "description": "<p>Details of the user requested</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "user.username",
            "description": "<p>Username</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "user.first_name",
            "description": "<p>First Name</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "user.last_name",
            "description": "<p>Last Name</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "user.role",
            "description": "<p>Role of the user, used to restrict API access</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "400",
            "optional": false,
            "field": "UserNotFound",
            "description": "<p>The &lt;code&gt;username&lt;/code&gt; was not found</p>"
          },
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Admin",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/users/:username",
    "title": "Add new user to the database",
    "name": "PostUser",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "Success",
            "description": "<p>Success message</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Admin",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./coverage/lcov-report/drone/lib/router.js.html",
    "groupTitle": "Users",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/users/:username",
    "title": "Add new user to the database",
    "name": "PostUser",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "Success",
            "description": "<p>Success message</p>"
          }
        ]
      }
    },
    "permission": [
      {
        "name": "Admin",
        "title": "",
        "description": ""
      }
    ],
    "version": "0.0.0",
    "filename": "./lib/router.js",
    "groupTitle": "Users",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "401",
            "optional": false,
            "field": "NotAuthorised",
            "description": "<p>Not authorised to access</p>"
          }
        ]
      }
    }
  }
] });