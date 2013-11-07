<?php
namespace lib;

/**
* WebSocketUser -- The Socket User Class
*
* Also handles TCP Connections (Wrapper).
*
* @author Anders Evenrud <andersevenrud@gmail.com>
* @package OSjs.Libraries
* @class
*/
class WebSocketUser
{
  public $id = null; //!< User unique ID
  public $socket = null; //!< WebSocket Socket
  public $handshake = null; //!< Handshaked ?
  public $type = "hybi-00"; //!< WebSocket type

  public $tcp; //!< TCP Socket
  public $tcp_index; //!< TCP Socket index

  /**
* @constructor
*/
  public function __construct($socket) {
    $this->id = uniqid();
    $this->socket = $socket;

    print "User created '{$this->id}'...\n";
  }

  /**
* Create a TCP connection
* @param String $conn Destination Host
* @param int $port Destination Port
* @return Socket
*/
  public function connect($conn, $port) {
    if ( !$this->tcp ) {
      if ( $this->tcp = socket_create(AF_INET, SOCK_STREAM, SOL_TCP) ) {
        print "User: Creating TCP Connection ($conn:$port)\n";
        socket_connect($this->tcp, $conn, $port);
        return $this->tcp;
      }
    }
    return null;
  }

  /**
* Send a message over TCP connection
* @param String $st Message
* @return Socket
*/
  public function send($st) {
    if ( $socket = $this->tcp ) {
      $length = strlen($st);
      print "User: Sending TCP message ($length)\n";
      while ( true ) {
        $sent = socket_write($socket, $st, $length);
        if ($sent === false) {
          break;
        }
        // Check if the entire message has been sented
        if ($sent < $length) {

          // If not sent the entire message.
          // Get the part of the message that has not yet been sented as message
          $st = substr($st, $sent);

          // Get the length of the not sented part
          $length -= $sent;
        } else {
          break;
        }

      }

      return $socket;
    }
    return null;
  }

  /**
* Disconnect the TCP Socket
* @return bool
*/
  public function disconnect() {
    if ( $this->tcp ) {
      print "User: Disconnecting TCP\n";
      socket_close($this->tcp);

      $this->tcp = null;

      return true;
    }

    return false;
  }
}

