(function(){
	'use strict';

	angular.module('dashboard')
		.service('audioService', [ AudioService]);


	function AudioService(){
		var context;
		return {
			initService : function(){
				if (!window.AudioContext) {
					if (!window.webkitAudioContext) {
						alert("Your browser does not support any AudioContext and cannot play back audio.");
						return;
					}
					window.AudioContext = window.webkitAudioContext;
				}
				context = new AudioContext();
			},
			playByteArray : function(byteArray) {
				// Input is Int16Array
	
				var myAudioBuffer = context.createBuffer(1, 8192, 44100);
				var nowBuffering = myAudioBuffer.getChannelData(0);
				for(var i = 0 ; i < 8192; i++){
					nowBuffering[i] = byteArray[i] / Math.pow(2,15);
				}
				var source = context.createBufferSource();
				source.buffer = myAudioBuffer;
				source.connect(context.destination);
				source.start();
			}
		}

	}


})();
