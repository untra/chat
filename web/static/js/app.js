// Brunch automatically concatenates all files in your
// watched paths. Those paths can be configured at
// config.paths.watched in "brunch-config.js".
//
// However, those files will only be executed if
// explicitly imported. The only exception are files
// in vendor, which are never wrapped in imports and
// therefore are always executed.

// Import dependencies
//
// If you no longer want to use a dependency, remember
// to also remove its path from "config.paths.watched".
import "phoenix_html"
import socket from "./socket"

const channel = socket.channel("call", {})
channel.join()
  .receive("ok", () => { console.log("Successfully joined call channel") })
  .receive("error", () => { console.log("Unable to join") })

window.localStream = null;
window.peerConnection = null;
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const connectButton = document.getElementById("connect");
const callButton = document.getElementById("call");
const hangupButton = document.getElementById("hangup");

hangupButton.disabled = true;
callButton.disabled = true;
connectButton.onclick = connect;
callButton.onclick = call;
hangupButton.onclick = hangup;

const gotStream = (stream) => {
   console.log("Received local stream");
   localVideo.src = URL.createObjectURL(stream);
   window.localStream = stream;
   setupPeerConnection();
}

function connect() {
  console.log("Requesting local stream");
  navigator.getUserMedia({audio:true, video:true}, gotStream, error => {
       console.log("getUserMedia error: ", error);
   });
}

const setupPeerConnection = () => {
  console.log('setupPeerConnection')
  connectButton.disabled = true;
  callButton.disabled = false;
  hangupButton.disabled = false;
  console.log("Waiting for call");

  const servers = {
    "iceServers": [{
      "url": "stun:stun.example.org"
    }]
  };

  window.peerConnection = new RTCPeerConnection(servers);
  console.log("Created local peer connection");
  window.peerConnection.onicecandidate = gotLocalIceCandidate;
  window.peerConnection.onaddstream = gotRemoteStream;
  window.peerConnection.addStream(window.localStream);
  console.log("Added localStream to localPeerConnection");
}

function call() {
  callButton.disabled = true;
  console.log("Starting call");
  window.peerConnection.createOffer(gotLocalDescription, handleError);
}

const gotLocalDescription = (description) => {
  window.peerConnection.setLocalDescription(description, () => {
      channel.push("message", { body: JSON.stringify({
              "sdp": window.peerConnection.localDescription
          })});
      }, handleError);
  console.log("Offer from localPeerConnection: \n" + description.sdp);
}

const gotRemoteDescription = (description) => {
  console.log("Answer from remotePeerConnection: \n" + description.sdp);
  window.peerConnection.setRemoteDescription(new RTCSessionDescription(description.sdp));
  window.peerConnection.createAnswer(gotLocalDescription, handleError);
}

const gotRemoteStream = (event) => {
  remoteVideo.src = URL.createObjectURL(event.stream);
  console.log("Received remote stream");
}

const gotLocalIceCandidate = (event) => {
  if (event.candidate) {
    console.log("Local ICE candidate: \n" + event.candidate.candidate);
    channel.push("message", {body: JSON.stringify({
        "candidate": event.candidate
    })});
  }
}

const gotRemoteIceCandidate = (event) => {
  callButton.disabled = true;
  if (event.candidate) {
    window.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    console.log("Remote ICE candidate: \n " + event.candidate.candidate);
  }
}

function hangup() {
  console.log("Ending call");
  window.peerConnection.close();
  localVideo.src = undefined;
  window.peerConnection = null;
  hangupButton.disabled = true;
  connectButton.disabled = false;
  callButton.disabled = true;
}

const handleError = (error) => {
  console.log(error.name + ": " + error.message);
}

channel.on("message", payload => {
  const message = JSON.parse(payload.body);
  if (message.sdp) {
    gotRemoteDescription(message);
  } else {
    gotRemoteIceCandidate(message);
  }
})





// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

// import socket from "./socket"
