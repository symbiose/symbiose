<?php
namespace lib;

use \lib\WebSocketUser;
use \Exception;

/*!
* @file
* OS.js - JavaScript Operating System - Contains Server Class
*
* Copyright (c) 2011-2012, Anders Evenrud <andersevenrud@gmail.com>
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
* 1. Redistributions of source code must retain the above copyright notice, this
* list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright notice,
* this list of conditions and the following disclaimer in the documentation
* and/or other materials provided with the distribution.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
* ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
* SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*
* @author Anders Evenrud <andersevenrud@gmail.com>
* @licence Simplified BSD License
* @created 2011-06-03
*/

/**
* WebSocketServer -- The WebSocket Server Class
*
* Docs:
* https://github.com/esromneb/phpwebsocket/blob/master/websocket.class.php
* http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-17
*
* @author Anders Evenrud <andersevenrud@gmail.com>
* @package OSjs.Libraries
* @class
*/
class WebSocketServer
{

	/////////////////////////////////////////////////////////////////////////////
	// CONSTANTS
	/////////////////////////////////////////////////////////////////////////////

	const SERVER_BACKLOG = 20;
	const SERVER_NONBLOCK = false;

	/////////////////////////////////////////////////////////////////////////////
	// VARIABLES
	/////////////////////////////////////////////////////////////////////////////

	protected $_master = null; //!< Master Socket
	protected $_sockets = array(); //!< Connected Sockets
	protected $_users = array(); //!< Connected ServerUser(s)

	/////////////////////////////////////////////////////////////////////////////
	// MAGICS
	/////////////////////////////////////////////////////////////////////////////

	/**
	* Create a new instance
	* @param String $host Destination Host
	* @param int $port Destination Port
	* @constructor
	*/
	protected function __construct($host, $port) {
		if ( $this->_master = self::createSocket($host, $port) ) {
			$this->_sockets[] = $this->_master;

			print "Server: Running on {$host}:{$port}\n";
		}
	}

	/////////////////////////////////////////////////////////////////////////////
	// STATIC METHODS
	/////////////////////////////////////////////////////////////////////////////

	/**
	* Create a new instance of Server
	* @param String $host Destination Host
	* @param int $port Destination Port
	* @return Server
	*/
	public final static function run($host, $port) {
		$cname = get_called_class();
		$server = new $cname($host, $port);

		if ( !$server->_master || !$server->_sockets ) {
			throw new Exception("Master socket was not created!");
		}

		$buffer = null;
		while ( true ) {
			$changed = $server->_sockets;
			$write = null;
			$except = null;

			// Select all sockets for handling
			socket_select($changed, $write, $except, null);

			foreach ($changed as $socket) {
				// Handle Master socket
				if ( $socket == $server->_master ) {
					$client = socket_accept($server->_master);
					if ( $client < 0 ) {
						usleep(100);
						continue;
					} else if ($client !== false) {
						$server->_connect($client);
					}
				}
				// Handle data recieved
				else {
					$data = '';
					$i = 0;
					$firstBytes = 0;
					while($bytes = socket_recv($socket, $buffer, 2048, MSG_DONTWAIT)) {
						if ($i == 0) {
							$firstBytes = $bytes;
						}

						$data .= $buffer;
						$i++;
					}

					// If no more data was recieved, disconnect the socket
					if ($firstBytes == 0) {
						$server->_disconnect($socket);
					} else {
						// Seems like we got a handshake or data recieved
						$user = $server->_getUserBySocket($socket);
						if ( !$user->handshake ) {
							$server->_handshake($user, $data);
						} else {
							$server->_process($user, $data, $socket == $user->tcp);
						}
					}
				}
			}
		}
	}

	/**
	* Create a new Socket
	* @param String $address Source Host
	* @param int $port Source Port
	* @return Mixed
	*/
	public final function createSocket($address, $port) {
		// Create a internet streaming TCP socket
		if ( $master = socket_create(AF_INET, SOCK_STREAM, SOL_TCP) ) {
			// Set socket options
			if ( socket_set_option($master, SOL_SOCKET, SO_REUSEADDR, 1) ) {
				// Bins the socket to the configured address in 'header.php'
				if ( socket_bind($master, $address, $port) ) {
					// Listen for connections
					if ( socket_listen($master, self::SERVER_BACKLOG) ) {
						if ( self::SERVER_NONBLOCK ) {
							socket_set_nonblock($master);
						}

						return $master;
					}
				}
			}
		}
		return null;
	}

	/////////////////////////////////////////////////////////////////////////////
	// WebSocket METHODS
	/////////////////////////////////////////////////////////////////////////////

	/**
	* Connect a Socket and ServerUser
	* @param Socket $socket Socket
	* @return void
	*/
	protected function _connect($socket) {
		print "Server: Connection requested...\n";

		// Add socket and user our Server instance
		$this->_sockets[] = $socket;
		$this->_users[] = new WebSocketUser($socket);
	}

	/**
	* Disconnect Socket (Also ServerUser)
	* @param Socket $socket Socket
	* @return void
	*/
	protected function _disconnect($socket) {
		// Check if we find a user for this socket
		$found = null;
		$i = 0;
		foreach ( $this->_users as $u ) {
			if ( $u->socket == $socket ) {
				$found = $i;
				break;
			}
			$i++;
		}

		// If we found a user, disconnect
		if ( $found !== null ) {
			$u = $this->_users[$found];
			if ( $ind = $u->tcp_index ) {
				$u->disconnect();

				array_splice($this->_sockets, $ind, 1);
			}
			print "Server: Disconnecting user '{$u->id}'\n";
			array_splice($this->_users, $found, 1);
		}

		// Close and remove socket reference
		$index = array_search($socket, $this->_sockets);
		socket_close($socket);
		if ( $index >= 0 ) {
			array_splice($this->_sockets, $index, 1);
		}
	}

	/**
	* Do a ServerUser handshake over Socket
	*
	* Handles both hyby-00 and hybi-10 connections
	*
	* @param ServerUser $user ServerUser reference
	* @param String $buffer Data from Socket
	* @see WebSocket W3C Specifications
	* @return bool
	*/
	protected function _handshake($user, $buffer) {
		if ( preg_match("/Sec-WebSocket-Version: (.*)\r\n/",$buffer,$match) ) {
			if ( ((int)trim($match[1])) >= 8 ) {
				print "Server: Handshaking with '{$user->id} (hyby-10)'\n";

				$resource = $host = $origin = $key = $data = null;
				if(preg_match("/GET (.*) HTTP/" ,$buffer,$match)){ $resource=$match[1]; }
				if(preg_match("/Host: (.*)\r\n/" ,$buffer,$match)){ $host=$match[1]; }
				if(preg_match("/Origin: (.*)\r\n/",$buffer,$match)){ $origin=$match[1]; }
				if(preg_match("/Sec-WebSocket-Key: (.*)\r\n/",$buffer,$match)){ $key=$match[1]; }
				if(preg_match("/\r\n(.*?)\$/",$buffer,$match)){ $data=$match[1]; }

				if ( $resource && $host && $key && $data ) {
					$sha = sha1($key."258EAFA5-E914-47DA-95CA-C5AB0DC85B11",true);
					$hash_data = base64_encode($sha);

					$upgrade = "HTTP/1.1 101 Switching Protocols\r\n" .
											"Upgrade: WebSocket\r\n" .
											"Connection: Upgrade\r\n" .
											"Sec-WebSocket-Accept: " . $hash_data . "\r\n\r\n";

					// Write to socket and return
					//socket_write($user->socket,$upgrade.chr(0),strlen($upgrade.chr(0)));
					socket_write($user->socket, $upgrade, strlen($upgrade));
					$user->handshake = true;
					$user->type = "hybi-10";

					print "Server: Handshaked with '{$user->id} (hyby-10)'\n";

					return true;
				}

				print "Server: Failed to handshake with '{$user->id} (hybi-10)'\n";
				return false;
			} else {
				print "Server: Handshaking with '{$user->id}' (hybi-00)\n";

				// Parse the HTML header
				$resource = $host = $origin = $strkey1 = $strkey2 = $data = null;
				if(preg_match("/GET (.*) HTTP/" ,$buffer,$match)){ $resource=$match[1]; }
				if(preg_match("/Host: (.*)\r\n/" ,$buffer,$match)){ $host=$match[1]; }
				if(preg_match("/Origin: (.*)\r\n/",$buffer,$match)){ $origin=$match[1]; }
				if(preg_match("/Sec-WebSocket-Key2: (.*)\r\n/",$buffer,$match)){ $strkey2=$match[1]; }
				if(preg_match("/Sec-WebSocket-Key1: (.*)\r\n/",$buffer,$match)){ $strkey1=$match[1]; }
				if(preg_match("/\r\n(.*?)\$/",$buffer,$match)){ $data=$match[1]; }

				if ( $resource && $host && $strkey1 && $strkey2 ) {
					// Now match up
					$numkey1 = preg_replace('/[^\d]*/', '', $strkey1);
					$numkey2 = preg_replace('/[^\d]*/', '', $strkey2);
					$spaces1 = strlen(preg_replace('/[^ ]*/', '', $strkey1));
					$spaces2 = strlen(preg_replace('/[^ ]*/', '', $strkey2));

					//if ($spaces1 == 0 || $spaces2 == 0 || $numkey1 % $spaces1 != 0 || $numkey2 % $spaces2 != 0) {
					if ($spaces1 == 0 || $spaces2 == 0 || fmod($numkey1, $spaces1) != 0 || fmod($numkey2, $spaces2) != 0) {
						socket_close($user->socket);
						return false;
					}

					// Create a handshake response
					$ctx = hash_init('md5');
					hash_update($ctx, pack("N", $numkey1/$spaces1));
					hash_update($ctx, pack("N", $numkey2/$spaces2));
					hash_update($ctx, $data);
					$hash_data = hash_final($ctx,true);

					$upgrade = "HTTP/1.1 101 WebSocket Protocol Handshake\r\n" .
											"Upgrade: WebSocket\r\n" .
											"Connection: Upgrade\r\n" .
											"Sec-WebSocket-Origin: " . $origin . "\r\n" .
											"Sec-WebSocket-Location: ws://" . $host . $resource . "\r\n" .
											"\r\n" .
											$hash_data;

					// Write to socket and return
					socket_write($user->socket,$upgrade.chr(0),strlen($upgrade.chr(0)));
					$user->handshake = true;

					print "Server: Handshaked with '{$user->id} (hybi-00)'\n";
					return true;
				}

				print "Server: Failed to handshake with '{$user->id} (hybi-00)'\n";
				return false;
			}
		}

		print "Server: Invalid handshake attempt by '{$user->id}'\n";
		return false;
	}


	/**
	* Send a message to a Client Socket
	*
	* Handles both hyby-00 and hybi-10 connections
	*
	* @param String $type Connection hybi-type
	* @param Socket $client Client Socket
	* @param String $data Data to send
	* @return void
	*/
	protected function _send($type, $client, $data) {
		print "Server: Sending message (" . strlen($data) . ")\n";
		if ( $type == "hybi-00" ) {
			$msg = chr(0).$data.chr(255);
			$result = socket_write($client, $msg, strlen($msg));
			if ( !$result ) {
				$this->_disconnect($client);
				$client = false;
			}
		} else {
			// FIXME throw error if message length is longer than 0x7FFFFFFFFFFFFFFF chracters
			$header = " ";
			$header[0] = chr(0x81);
			$header_length = 1;

			//Payload length: 7 bits, 7+16 bits, or 7+64 bits
			$dataLength = strlen($data);

			//The length of the payload data, in bytes: if 0-125, that is the payload length.
			if ( $dataLength <= 125 ) {
				$header[1] = chr($dataLength);
				$header_length = 2;
			} else if ( $dataLength <= 65535 ) {
				// If 126, the following 2 bytes interpreted as a 16
				// bit unsigned integer are the payload length.
				$header[1] = chr(126);
				$header[2] = chr($dataLength >> 8);
				$header[3] = chr($dataLength & 0xFF);
				$header_length = 4;
			} else {
				// If 127, the following 8 bytes interpreted as a 64-bit unsigned integer (the
				// most significant bit MUST be 0) are the payload length.
				$header[1] = chr(127);
				$header[2] = chr(($dataLength & 0xFF00000000000000) >> 56);
				$header[3] = chr(($dataLength & 0xFF000000000000) >> 48);
				$header[4] = chr(($dataLength & 0xFF0000000000) >> 40);
				$header[5] = chr(($dataLength & 0xFF00000000) >> 32);
				$header[6] = chr(($dataLength & 0xFF000000) >> 24);
				$header[7] = chr(($dataLength & 0xFF0000) >> 16);
				$header[8] = chr(($dataLength & 0xFF00 ) >> 8);
				$header[9] = chr( $dataLength & 0xFF );
				$header_length = 10;
			}

			$result = socket_write($client, $header . $data, strlen($data) + $header_length);
			//$result = socket_write($client, chr(0x81) . chr(strlen($data)) . $data, strlen($data) + 2);
			if ( !$result ) {
				$this->_disconnect($client);
				$client = false;
			}
		}
	}

	/**
	* Process a ServerUser message
	*
	* Handles both hyby-00 and hybi-10 connections
	*
	* TODO: Error handling
	*
	* @param WebSocketUser $user ServerUser
	* @param string $data Data to process
	* @param bool $external External source (default = false)
	* @return void
	*/
	protected function _process($user, $data, $external = false) {
		print "Server: Processing message (" . strlen($data) . ")\n";
		$msg = null;
		if ( $external ) {
			//print "< EXT: ---\n";
			$this->_send($user->type, $user->socket, json_encode(array("response" => (string) $data)));
		} else {
			// Unwrap message
			if ( $user->type == "hybi-00" ) {
				$msg = substr($data,1,strlen($data)-2);
			} else {
				$bytes = $data;
				$dataLength = '';
				$mask = '';
				$coded_data = '';
				$decodedData = '';
				$secondByte = sprintf('%08b', ord($bytes[1]));
				$masked = ($secondByte[0] == '1') ? true : false;
				$dataLength = ($masked === true) ? ord($bytes[1]) & 127 : ord($bytes[1]);

				if ( $masked === true ) {
					if ( $dataLength === 126 ) {
						$mask = substr($bytes, 4, 4);
						$coded_data = substr($bytes, 8);
					} else if ( $dataLength === 127 ) {
						$mask = substr($bytes, 10, 4);
						$coded_data = substr($bytes, 14);
					} else {
						$mask = substr($bytes, 2, 4);
						$coded_data = substr($bytes, 6);
					}
					for($i = 0; $i < strlen($coded_data); $i++) {
						$decodedData .= $coded_data[$i] ^ $mask[$i % 4];
					}
				} else {
					if ( $dataLength === 126 ) {
						$decodedData = substr($bytes, 4);
					} else if ( $dataLength === 127 ) {
						$decodedData = substr($bytes, 10);
					} else {
						$decodedData = substr($bytes, 2);
					}
				}

				$msg = $decodedData;
			}
		}

		return $msg;
	}

	/////////////////////////////////////////////////////////////////////////////
	// SET
	/////////////////////////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////////
	// GET
	/////////////////////////////////////////////////////////////////////////////

	/**
	* Get the SocketUser by Socket
	* @param Socket $socket Socket reference
	* @return Mixed
	*/
	protected function _getUserBySocket($socket) {
		foreach ( $this->_users as $u ) {
			if ( $u->socket == $socket || $u->tcp == $socket ) {
				return $u;
			}
		}
		return null;
	}

}

