<?php
namespace lib\ctrl\rawDataCall;

use \Exception;
use \RuntimeException;

/**
 * Provides access to the system's files.
 */
class FileController extends \lib\RawBackController {
	public function executeIndex(\lib\HTTPRequest $request) {
		$fileManager = $this->managers()->getManagerOf('file');

		if (!$request->getExists('path')) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new \RuntimeException('No file specified');
		}

		$filePath = $request->getData('path');

		//Authorizations control
		$user = $this->app()->user();
		$authManager = $this->managers()->getManagerOf('authorization');

		$userAuths = array();

		if ($user->isLogged()) {
			$userAuths = $authManager->getByUserId($user->id());
		}

		try {
			$this->guardian->controlArgAuth('file.read', $filePath, $userAuths);
		} catch(Exception $e) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 403 Forbidden');
			throw $e;
		}

		//Check if the file exists
		if (!$fileManager->exists($filePath)) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new \RuntimeException('The specified file "'.$filePath.'" does\'t exist');
		}

		if ($fileManager->isDir($filePath)) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 406 Not Acceptable');
			throw new \RuntimeException('The specified file "'.$filePath.'" is a directory');
		}

		//Send response
		$this->app->httpResponse()->addHeader('Content-Type: '.$fileManager->mimetype($filePath));

		$out = $fileManager->read($filePath);
		$this->responseContent->setValue($out);
	}
}