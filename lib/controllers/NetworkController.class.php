<?php
namespace lib\controllers;

class NetworkController extends \lib\ServerCallComponent {
	protected function readFile($url) {
		$content = file_get_contents($url);
		return array(
			'content' => $content
		);
	}
}