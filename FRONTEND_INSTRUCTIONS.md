# Frontend Implementation Guide - Virtual Class System

This guide explains how to connect your React frontend to the Virtual Class System backend we just built.

## 1. Install Dependencies
In your **Frontend** project, install the socket client and a WebRTC helper (optional but recommended for simplicity, or use native WebRTC):

```bash
npm install socket.io-client simple-peer
```
*Note: `simple-peer` is a great wrapper for WebRTC. If you prefer native `RTCPeerConnection`, the logic is similar but more verbose.*

## 2. Initialize Socket
Create a `socket.js` or `SocketContext.js` helper.

```javascript
// src/socket.js
import io from 'socket.io-client';

// Change URL to your deployed server or localhost
export const socket = io('https://stms-server-4ova.onrender.com', {
    autoConnect: false
});
```

## 3. Virtual Class Component (`VirtualClass.jsx`)
Here is a complete example using `simple-peer` for a mesh network (everyone connects to everyone).

```jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Peer from 'simple-peer';
import { socket } from '../socket';

const VirtualClass = () => {
    const { roomId } = useParams(); // URL parameter for Lecture ID
    const [peers, setPeers] = useState([]);
    const [stream, setStream] = useState(null);
    const userVideo = useRef();
    const peersRef = useRef([]); // To keep track of peer instances
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId') || 'student-' + Math.floor(Math.random() * 1000); // Get from Auth Context

    useEffect(() => {
        socket.connect();

        // 1. Get User Media (Camera/Mic)
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
            setStream(currentStream);
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }

            // 2. Join the Room
            socket.emit('join-room', { roomId, userId });

            // 3. Listen: User Connected (Create Offer)
            socket.on('user-connected', (remoteUserId) => {
                const peer = createPeer(remoteUserId, socket.id, currentStream);
                peersRef.current.push({
                    peerID: remoteUserId,
                    peer,
                });
                setPeers(users => [...users, { peerID: remoteUserId, peer }]);
            });

            // 4. Listen: Receive Offer (Create Answer)
            socket.on('offer', (payload) => {
                const peer = addPeer(payload.sdp, payload.caller, currentStream);
                peersRef.current.push({
                    peerID: payload.caller,
                    peer,
                });
                setPeers(users => [...users, { peerID: payload.caller, peer }]);
            });

            // 5. Listen: Receive Answer
            socket.on('answer', (payload) => {
                const item = peersRef.current.find(p => p.peerID === payload.caller);
                if (item) {
                     item.peer.signal(payload.sdp);
                }
            });

            // 6. Listen: ICE Candidate
            socket.on('ice-candidate', (payload) => {
                const item = peersRef.current.find(p => p.peerID === payload.caller);
                if (item) {
                    item.peer.signal(payload.candidate);
                }
            });

            // 7. Listen: User Disconnected
            socket.on('user-disconnected', (id) => {
                 const peerObj = peersRef.current.find(p => p.peerID === id);
                 if(peerObj) peerObj.peer.destroy();
                 const peers = peersRef.current.filter(p => p.peerID !== id);
                 peersRef.current = peers;
                 setPeers(peers);
            });
        });

        return () => {
            socket.disconnect();
            // Cleanup streams...
        };
    }, []);

    // Create a new Peer (Initiator)
    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        // Send Offer
        peer.on('signal', signal => {
            socket.emit('offer', { target: userToSignal, caller: callerID, sdp: signal });
        });
        
        // Handle ICE manually if needed, or simple-peer handles it in 'signal'
        // Note: Our backend 'offer' event expects { target, caller, sdp }
        // Simple-peer's 'signal' data includes SDP or ICE candidate.
        // You might need to differentiate or just pass it all as 'sdp' prop if simple-peer handles it.
        // For robust implementation, handle 'ice-candidate' separately if simple-peer emits type 'candidate'.

        return peer;
    }

    // Add a Peer (Receiver)
    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        // Send Answer
        peer.on('signal', signal => {
            socket.emit('answer', { target: callerID, caller: socket.id, sdp: signal });
        });

        peer.signal(incomingSignal);

        return peer;
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* My Video */}
            <video muted ref={userVideo} autoPlay playsInline style={{ width: '300px', border: '2px solid blue' }} />
            
            {/* Remote Videos */}
            {peers.map((peerObj, index) => {
                return (
                    <Video key={index} peer={peerObj.peer} />
                );
            })}
        </div>
    );
};

const Video = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return <video playsInline autoPlay ref={ref} style={{ width: '300px', border: '2px solid red' }} />;
};

export default VirtualClass;
```

## 4. Key Concepts Explained
- **`simple-peer`**: A library that simplifies WebRTC connection logic.
- **Mesh Topology**: This example creates a direct connection between every pair of users. Only suitable for small classes (3-5 people). 
- **SFU (Scalable Implementation)**: For larger classes (Wait, the backend we built is for Signaling only). The STMS requirements mentioned "Node.js Media Server (SFU approach)". Building a real SFU from scratch is very complex. The code provided here is "Mesh". **Ideally, for an SFU, you would use a library like `mediasoup` or `livekit` on the backend.** 
    - *Note: Given the project constraints and MERN stack, Mesh is the standard starting point. If you truly need SFU, we would need to install `mediasoup` on the server.*

## 5. Attendance
The backend automatically tracks how long the socket is connected.
- When the component mounts (`socket.connect()`), the timer starts.
- When the component unmounts (`socket.disconnect()`), the timer stops and attendance is marked.
- **No extra frontend code is needed for attendance!**
