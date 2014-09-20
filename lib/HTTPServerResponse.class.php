<?php
namespace lib;

use Ratchet\ConnectionInterface;
use Guzzle\Http\Message\Response;

/**
 * The HTTP server response.
 * @since 1.0beta5
 */
class HTTPServerResponse extends HTTPResponse {
	protected $headersSent = false;
	protected $headers = array();

	public function __construct(ConnectionInterface $conn) {
		$this->conn = $conn;
	}

	public function addHeader($header) {
		$this->headers[] = $header;
	}

	public function removeHeader($headerToRemove) {
		foreach ($this->headers as $i => $header) {
			if ($headerToRemove == $header) {
				unset($this->headers[$i]);
				break;
			}
		}
	}

	public function listHeaders() {
		return $this->headers;
	}

	public function responseCode() {
		foreach ($this->headers as $header) {
			if (preg_match('#^HTTP/[0-9.]+ ([0-9]{3}) ([a-zA-Z ]+)$#', $header, $matches)) {
				return (int) $matches[1];
			}
		}
		return 200;
	}

	protected function getRaw($output = '') {
		$status = $this->responseCode();
		$headers = array();
		foreach ($this->headers as $header) {
			$parts = explode(':', $header, 2);
			if (count($parts) == 2) {
				$headers[$parts[0]] = $parts[1];
			}
		}

		return new Response($status, $headers, $output);
	}

	public function getOutput() {
		return $this->getRaw($this->content->generate());
	}

	public function send() {
		$this->output($this->content->generate());
		$this->conn->close();
	}

	public function headersSent() {
		return $this->headersSent;
	}

	public function output($out) {
		if (!$this->headersSent) {
			$this->headersSent = true;

			$this->output((string)$this->getRaw());
		}

		$this->length += strlen($out);
		
		$this->conn->send($out);
	}
}