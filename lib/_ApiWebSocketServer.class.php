<?php
namespace lib;

use \Exception;

class ApiWebSocketServer extends WebSocketServer
{
	protected function _handleRequest($reqData) {
		$apiCall = new Api;
		$apiCall->emulate($reqData);
		$apiCall->run();

		$resp = $apiCall->httpResponse()->content();

		return $resp;
	}

	protected function _handleRequestGroup($reqsData) {
		$responses = array();

		foreach($reqsData as $reqData) {
			$responses[] = $this->_handleRequest($reqData);
		}

		$resp = new ApiGroupResponse;
		$resp->setResponses($responses);

		return $resp;
	}

	protected function _process($user, $data, $external = false) {
		if ($input = parent::_process($user, $data, $external)) {
			try {
				$req = json_decode($input, true);

				if (empty($req) || $req === false) {
					throw new \RuntimeException('Bad request: invalid JSON: '.$input);
				}
				if (!isset($req['id']) || !is_int($req['id'])) {
					throw new \RuntimeException('Bad request: invalid request id');
				}
				if (!isset($req['data']) || !is_array($req['data'])) {
					throw new \RuntimeException('Bad request: invalid request data');
				}

				$reqId = $req['id'];

				if (isset($req['groupped']) && $req['groupped'] == true) {
					$resp = $this->_handleRequestGroup($req['data']);
				} else {
					$resp = $this->_handleRequest($req['data']);
				}

				$resp->setId($reqId);
			} catch (Exception $e) {
				$errMsg = $e->getMessage();

				$resp = new ApiResponse();
				$resp->setSuccess(false);
				$resp->setValue($errMsg);
				$resp->setChannel(2, $errMsg);
			}

			$output = $resp->generate();

			$this->_send($user->type, $user->socket, $output);
		}
	}
}