<?php
namespace lib;

use Ratchet\ConnectionInterface;
use Symfony\Component\HttpFoundation\Session\Session;
use Guzzle\Http\Message\RequestInterface;
use Guzzle\Http\QueryString;

/**
 * The HTTP server request.
 * @author Simon Ser
 * @since 1.0beta5
 */
class HTTPServerRequest extends HTTPRequest {
	protected $conn;
	protected $req;

	public function __construct(ConnectionInterface $conn, RequestInterface $req) {
		$body = (string) $req->getBody();
		if (!empty($body)) {
			$query = QueryString::fromString($body);
			$fields = $query->getAll();
			foreach ($fields as $field => $value) {
				$req->setPostField($field, $value);
			}
		}

		$this->conn = $conn;
		$this->session = $conn->Session;
		$this->req = $req;
	}

	public function cookieData($key) {
		return isset($_COOKIE[$key]) ? $_COOKIE[$key] : null;
	}

	public function cookieExists($key) {
		return isset($_COOKIE[$key]);
	}

	public function getData($key) {
		$query = $this->req->getQuery();
		return (isset($query[$key])) ? $query[$key] : null;
	}

	public function getExists($key) {
		$query = $this->req->getQuery();
		return (isset($query[$key]));
	}

	public function postData($key) {
		$fields = $this->req->getPostFields();
		return isset($fields[$key]) ? $fields[$key] : null;
	}

	public function postExists($key) {
		$fields = $this->req->getPostFields();
		return isset($fields[$key]);
	}

	public function requestURI() {
		return $this->req->getPath();
	}

	public function remoteAddress() {
		return $this->conn->remoteAddress;
	}

	public function acceptLanguage() {
		return (string) $request->getHeaders()->get('accept-language');
	}
}