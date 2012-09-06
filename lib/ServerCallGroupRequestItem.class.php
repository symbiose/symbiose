<?php
namespace lib;

/**
 * ServerCallGroupRequestItem represente une requete d'un groupe de requetes.
 * @author $imon
 * @version 1.0
 */
class ServerCallGroupRequestItem extends ServerCallRequest {
	public function __construct($data) {
		if (empty($data['class']))
				throw new RuntimeException('Param&egrave;tre "class" manquant dans la requ&ecirc;te HTTP #'.$index);
		if (empty($data['method']))
			throw new RuntimeException('Param&egrave;tre "method" manquant dans la requ&ecirc;te HTTP #'.$index);

		$this->class = $data['class'];
		$this->method = $data['method'];
		$this->args = array_values((array) $data['arguments']);
		$this->username = $data['username'];
		$this->password = $data['password'];
		$this->pid = (int) $data['pid'];
		$this->key = $data['key'];
	}
}
