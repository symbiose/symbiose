<?php
namespace lib\ctrl\api;

/**
 * Execute commands.
 * @author $imon
 */
class CmdController extends \lib\ApiBackController {
	protected $terminal, $cmd;

	/**
	 * Execute a command.
	 * @param  string $cmdText    The command.
	 * @param  int    $terminalId The terminal ID.
	 */
	public function executeExecute($cmdText, $terminalId) {
		$fileManager = $this->managers()->getManagerOf('file');
		$terminalManager = $this->managers()->getManagerOf('terminal');
		$authManager = $this->managers()->getManagerOf('authorization');
		$processManager = $this->managers()->getManagerOf('process');
		$user = $this->app()->user();

		if (!$terminalManager->isTerminal($terminalId)) {
			$terminal = $terminalManager->buildTerminal($terminalId);

			$terminal->setDir(($user->isLogged()) ? '~' : '/');
			$terminalManager->updateTerminal($terminal);
		} else {
			$terminal = $terminalManager->getTerminal($terminalId);
		}

		$cmd = $terminalManager->buildCmd($cmdText, $terminal);
		$executablePath = $terminalManager->findExecutable($cmd, $terminal);

		$auths = array();
		if ($user->isLogged()) {
			$auths = $authManager->getByUserId($user->id());
		}
		$authManager->setByPid($cmd->id(), $auths);

		$executableScript = $fileManager->read($executablePath);
		switch ($fileManager->pathinfo($executablePath, PATHINFO_EXTENSION)) {
			case 'php':
				$this->terminal = $terminal;
				$this->cmd = $cmd;

				$_cmd_errMsg = null; //Complicated name because cmd script must not overwrite it

				ob_start();
				try {
					require($fileManager->toInternalPath($executablePath));
				} catch(\Exception $e) {
					$_cmd_errMsg = $e->getMessage();
				}
				$out = ob_get_contents();
				ob_end_clean();

				if (!empty($_cmd_errMsg)) {
					$this->responseContent->setSuccess(false);
					$this->responseContent->setChannel(2, $_cmd_errMsg);
					$this->responseContent->setValue($out."\n".$_cmd_errMsg);
				} else {
					$this->responseContent->setValue($out);
				}

				$authManager = $this->managers()->getManagerOf('authorization');
				$authManager->unsetByPid($this->cmd->id());
				break;
			case 'js':
				$authsNames = array();
				foreach($auths as $auth) {
					$authsNames[] = $auth['name'];
				}

				$processManager->run($cmd);

				$this->responseContent()->setData(array(
					'pid' => $cmd->id(),
					'key' => $cmd->key(),
					'authorizations' => $authsNames,
					'path' => $executablePath,
					'script' => $executableScript
				));
				break;
		}
	}
}