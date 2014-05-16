<?php

namespace FSi\Component\ACL;

use Monolog\Logger;

class ACL implements ACLInterface
{
    protected $resources = array();

    protected $roles = array();

    protected $permissions = array();

    protected $rolesParents = array();

    protected $resourcesParents = array();

    protected $ACEs = array();

    /**
     * @var Monolog\Logger
     */
    protected $logger;

    public function addPermission(PermissionInterface $permission)
    {
        $permissionId = spl_object_hash($permission);
        if (isset($this->permissions[$permissionId]))
            throw new ACLException('Specified permission is already registered.');
        $this->permissions[$permissionId] = $permission;
        return $this;
    }

    public function removePermission(PermissionInterface $permission)
    {
        $permissionId = spl_object_hash($permission);
        if (isset($this->permissions[$permissionId])) {
            unset($this->permissions[$permissionId]);
            foreach ($this->ACEs as $roleId => &$roleACEs)
                foreach ($roleACEs as $resourceId => &$resourceACEs)
                    unset($resourceACEs[$permissionId]);
        }
        return $this;
    }

    public function hasPermission(PermissionInterface $permission)
    {
        $permissionId = spl_object_hash($permission);
        return isset($this->permissions[$permissionId]);
    }

    public function addRole(RoleInterface $role, array $parentRoles = array())
    {
        $roleId = spl_object_hash($role);
        if (isset($this->roles[$roleId]))
            throw new ACLException('Specified role is already registered.');
        $this->roles[$roleId] = $role;
        foreach ($parentRoles as $parentRole) {
            $parentRoleId = spl_object_hash($parentRole);
            if (!isset($this->roles[$parentRoleId]))
                throw new ACLException('Detected unregistered role throught inheritance.');
            $this->rolesParents[$roleId][$parentRoleId] = $parentRole;
        }
        return $this;
    }

    public function removeRole(RoleInterface $role)
    {
        $roleId = spl_object_hash($role);
        if (isset($this->roles[$roleId])) {
            unset($this->roles[$roleId]);
            unset($this->rolesParents[$roleId]);
            unset($this->ACEs[$roleId]);
        }
        return $this;
    }

    public function hasRole(RoleInterface $role)
    {
        $roleId = spl_object_hash($role);
        return isset($this->roles[$roleId]);
    }

    public function addRoleParent(RoleInterface $role, RoleInterface $parentRole)
    {
        $roleId = spl_object_hash($role);
        $parentRoleId = spl_object_hash($parentRole);
        if (!isset($this->roles[$roleId]) || !isset($this->roles[$parentRoleId]))
            throw new ACLException('Detected unregistered role throught inheritance.');
        $this->rolesParents[$roleId][$parentRoleId] = $parentRole;
        return $this;
    }

    public function removeRoleParent(RoleInterface $role, RoleInterface $parentRole)
    {
        $roleId = spl_object_hash($role);
        $parentRoleId = spl_object_hash($parentRole);
        unset($this->rolesParents[$roleId][$parentRoleId]);
        return $this;
    }

    public function removeRoleParents(RoleInterface $role)
    {
        $roleId = spl_object_hash($role);
        unset($this->rolesParents[$roleId]);
        return $this;
    }

    public function hasRoleParent(RoleInterface $role, RoleInterface $parentRole)
    {
        $roleId = spl_object_hash($role);
        $parentRoleId = spl_object_hash($parentRole);
        return isset($this->rolesParents[$roleId][$parentRoleId]);
    }

    public function getRoleParents(RoleInterface $role)
    {
        $roleId = spl_object_hash($role);
        if (isset($this->rolesParents[$roleId]))
            return array_values($this->rolesParents[$roleId]);
        else
            return array();
    }

    public function getRoleChildren(RoleInterface $parentRole)
    {
        $parentRoleId = spl_object_hash($parentRole);
        $childrenRoles = array();
        foreach ($this->rolesParents as $roleId => $parentRoles)
            if (isset($parentRoles[$parentRoleId]))
                $childrenRoles[] = $this->roles[$roleId];
        return $childrenRoles;
    }

    public function getRolesByClass($className)
    {
        $roles = array();
        foreach ($this->roles as $roleId => $role)
            if (get_class($role) == $className)
                $roles[] = $role;
        return $roles;
    }

    public function addResource(ResourceInterface $resource, array $parentResources = array())
    {
        $resourceId = spl_object_hash($resource);
        if (isset($this->resources[$resourceId]))
            throw new ACLException('Specified resource is already registered.');
        $this->resources[$resourceId] = $resource;
        foreach ($parentResources as $parentResource) {
            $parentResourceId = spl_object_hash($parentResource);
            if (!isset($this->resources[$parentResourceId]))
                throw new ACLException('Detected unregistered resource throught inheritance.');
            $this->resourcesParents[$resourceId][$parentResourceId] = $parentResource;
        }
        return $this;
    }

    public function removeResource(ResourceInterface $resource)
    {
        $resourceId = spl_object_hash($resource);
        if (isset($this->resources[$resourceId])) {
            unset($this->resources[$resourceId]);
            unset($this->resourcesParents[$resourceId]);
            foreach ($this->ACEs as $roleId => &$roleACEs)
                unset($roleACEs[$resourceId]);
        }
        return $this;
    }

    public function hasResource(ResourceInterface $resource)
    {
        $resourceId = spl_object_hash($resource);
        return isset($this->resources[$resourceId]);
    }

    public function addResourceParent(ResourceInterface $resource, ResourceInterface $parentResource)
    {
        $resourceId = spl_object_hash($resource);
        $parentResourceId = spl_object_hash($parentResource);
        if (!isset($this->resources[$resourceId]) || !isset($this->resources[$parentResourceId]))
            throw new ACLException('Detected unregistered resource throught inheritance.');
        $this->resourcesParents[$resourceId][$parentResourceId] = $parentResource;
        return $this;
    }

    public function removeResourceParent(ResourceInterface $resource, ResourceInterface $parentResource)
    {
        $resourceId = spl_object_hash($resource);
        $parentResourceId = spl_object_hash($parentResource);
        unset($this->resourcesParents[$resourceId][$parentResourceId]);
        return $this;
    }

    public function removeResourceParents(ResourceInterface $resource)
    {
        $resourceId = spl_object_hash($resource);
        unset($this->resourcesParents[$resourceId]);
        return $this;
    }

    public function hasResourceParent(ResourceInterface $resource, ResourceInterface $parentResource)
    {
        $resourceId = spl_object_hash($resource);
        $parentResourceId = spl_object_hash($parentResource);
        return isset($this->resourcesParents[$resourceId][$parentResourceId]);
    }

    public function getResourceParents(ResourceInterface $resource)
    {
        $resourceId = spl_object_hash($resource);
        if (isset($this->resourcesParents[$resourceId]))
            return array_values($this->resourcesParents[$resourceId]);
        else
            return array();
    }

    public function getResourceChildren(ResourceInterface $parentResource)
    {
        $parentResourceId = spl_object_hash($parentResource);
        $childrenResources = array();
        foreach ($this->resourcesParents as $resourceId => $parentResources)
            if (isset($parentResources[$parentResourceId]))
                $childrenResource[] = $this->resource[$resourceId];
        return $childrenResource;
    }

    public function getResourcesByClass($className)
    {
        $resources = array();
        foreach ($this->resources as $resourceId => $resource)
            if (get_class($resource) == $className)
                $resources[] = $resource;
        return $resources;
    }

    public function addACE(ACEInterface $ace)
    {
        $role = $ace->getRole();
        $resource = $ace->getResource();
        $permissions = $ace->getPermissions();
        if (!isset($role) || !isset($resource) || !isset($permissions) || empty($permissions))
            throw new ACLException('Specified ACE is not fully configured');
        $roleId = spl_object_hash($role);
        if (!isset($this->roles[$roleId]))
            throw new ACLException('Detected unregistered role throught ACE');
        $resourceId = spl_object_hash($resource);
        if (!isset($this->resources[$resourceId]))
            throw new ACLException('Detected unregistered resource throught ACE.');
        if (!isset($this->ACEs[$roleId]))
            $this->ACEs[$roleId] = array();
        if (!isset($this->ACEs[$roleId][$resourceId]))
            $this->ACEs[$roleId][$resourceId] = array();
        foreach ($permissions as $permission) {
            $permissionId = spl_object_hash($permission);
            if (!isset($this->permissions[$permissionId]))
                throw new ACLException('Detected unregistered permission throught ACE.');
            $aceId = spl_object_hash($ace);
            if (isset($this->ACEs[$roleId][$resourceId][$permissionId][$aceId]))
                throw new ACLException('Specified ACE is already registered');
            if (!isset($this->ACEs[$roleId][$resourceId][$permissionId]))
                $this->ACEs[$roleId][$resourceId][$permissionId] = array();
            foreach ($this->ACEs[$roleId][$resourceId][$permissionId] as $existingACE)
                if ($existingACE == $ace)
                    continue 2;
            $this->ACEs[$roleId][$resourceId][$permissionId][$aceId] = $ace;
        }
        return $this;
    }

    public function removeACE(ACEInterface $ace)
    {
        $role = $ace->getRole();
        $resource = $ace->getResource();
        $permissions = $ace->getPermissions();
        $roleId = spl_object_hash($role);
        $resourceId = spl_object_hash($resource);
        $aceId = spl_object_hash($ace);
        foreach ($permissions as $permission) {
            $permissionId = spl_object_hash($permission);
            unset($this->ACEs[$roleId][$resourceId][$permissionId][$aceId]);
        }
        return $this;
    }

    public function hasACE(ACEInterface $ace)
    {
        $role = $ace->getRole();
        $resource = $ace->getResource();
        $permissions = $ace->getPermissions();
        $roleId = spl_object_hash($role);
        $resourceId = spl_object_hash($resource);
        $aceId = spl_object_hash($ace);
        foreach ($permissions as $permission) {
            $permissionId = spl_object_hash($permission);
            if (isset($this->ACEs[$roleId][$resourceId][$permissionId][$aceId]))
                return true;
        }
        return false;
    }

    /**
     * Check access right to the specified permission of the specified resource for the specified role.
     *
     * This method searches ACEs directly associated with specified params. If this gives no results (grant or revoke), then it
     * searches ACEs up in the hierarchy tree of resources starting from the specified one. If again this gives no results, then
     * it searches ACEs up in the hierarchy of roles starting from specified one. If none results are found then false is
     * returned so the access is revoked.
     *
     * @param RoleInterface $role
     * @param ResourceInterface $resource
     * @param PermissionInterface $permission
     * @param array $params
     * @return bool
     */
    public function isAllowed(RoleInterface $role, ResourceInterface $resource, PermissionInterface $permission, array $params = array())
    {
        $roleId = spl_object_hash($role);
        $resourceId = spl_object_hash($resource);
        $permissionId = spl_object_hash($permission);
        if (isset($this->logger))
            $this->logger->addRecord(Logger::INFO, sprintf(" Start checking if role %s (class: %s) has permission %s (class: %s) to resource %s (class: %s)",
                $role,
                get_class($role),
                $permission,
                get_class($permission),
                $resource,
                get_class($resource)
            ), $params);

        $allowed = $this->searchACEs($roleId, $resourceId, $permissionId, $params, 1);
        if (!isset($allowed))
            $allowed = $this->searchParentResourceACEs($roleId, $resourceId, $permissionId, $params, 1);
        if (!isset($allowed))
            $allowed = $this->searchParentRoleACEs($roleId, $resourceId, $permissionId, $params, 1);
        if (isset($allowed))
            return $allowed;
        if (isset($this->logger))
            $this->logger->addRecord(Logger::INFO, sprintf(" Access denied because no ACE has taken any decision",
                $role,
                $permission,
                $resource
            ));
        return false;
    }

    public function setLogger(Logger $logger)
    {
        $this->logger = $logger;
    }

    public function getLogger()
    {
        return $this->logger;
    }

    /**
     * Search ACEs associated with parent roles of specified role for pemissions granted to the specified resource.
     *
     * If any of the parent roles has explicitly revoked access right to the specified resource then this method returns false.
     * If any of parent roles has explicitly granted access right to the specified resource and none of them has it revoked then
     * this method returns true. Otherwise this method returns null.
     *
     * @param string $roleId
     * @param string $resourceId
     * @param string $permissionId
     * @param array $params
     * @return bool|null
     */
    protected function searchParentRoleACEs($roleId, $resourceId, $permissionId, array $params = array(), $level = 0)
    {
        $allowedAny = null;
        if (isset($this->rolesParents[$roleId]) && isset($this->resources[$resourceId]) && isset($this->permissions[$permissionId])) {
            if (isset($this->logger))
                $this->logger->addRecord(Logger::DEBUG, sprintf("%sChecking if any parent role has specified permission to specified resource",
                    str_repeat('  ', $level)
                ));
            foreach ($this->rolesParents[$roleId] as $parentRoleId => $parentRole) {
                $allowed = $this->searchACEs($parentRoleId, $resourceId, $permissionId, $params, $level + 1);
                if (!isset($allowed))
                    $allowed = $this->searchParentResourceACEs($parentRoleId, $resourceId, $permissionId, $params, $level + 1);
                if (!isset($allowed))
                    $allowed = $this->searchParentRoleACEs($parentRoleId, $resourceId, $permissionId, $params, $level + 1);
                if (isset($allowed)) {
                    if (!$allowed)
                        return $allowed;
                    else
                        $allowedAny = true;
                }
            }
        }
        return $allowedAny;
    }

    /**
     * Search ACEs associated with parent resources of specified resource for pemissions granted for the specified role.
     *
     * If specified role has explicitly revoked access right to any of the parent resources then this method returns false.
     * If specified role has explicitly granted access right to any of the parent resources and has not revoked access right to
     * any of them, then this method returns true. Otherwise this method returns null.
     *
     * @param string $roleId
     * @param string $resourceId
     * @param string $permissionId
     * @param array $params
     * @return bool|null
     */
    protected function searchParentResourceACEs($roleId, $resourceId, $permissionId, array $params = array(), $level = 0)
    {
        $allowedAny = null;
        if (isset($this->resourcesParents[$resourceId]) && isset($this->roles[$roleId]) && isset($this->permissions[$permissionId])) {
            if (isset($this->logger))
                $this->logger->addRecord(Logger::DEBUG, sprintf("%sChecking if specified role has specified permission to any parent resource",
                    str_repeat('  ', $level)
                ));
            foreach ($this->resourcesParents[$resourceId] as $parentResourceId => $parentResource) {
                $allowed = $this->searchACEs($roleId, $parentResourceId, $permissionId, $params, $level + 1);
                if (!isset($allowed))
                    $allowed = $this->searchParentResourceACEs($roleId, $parentResourceId, $permissionId, $params, $level + 1);
                if (isset($allowed)) {
                    if (!$allowed)
                        return $allowed;
                    else
                        $allowedAny = true;
                }
            }
        }
        return $allowedAny;
    }

    /**
     * Search ACEs associated with specified role, resource and permission.
     *
     * This method returns true or false only if specified role has directly granted or revoked specified permission to specified
     * resource. Otherwise it returns null.
     *
     * @param string $roleId
     * @param string $resourceId
     * @param string $permissionId
     * @param array $params
     * @return bool|null
     */
    protected function searchACEs($roleId, $resourceId, $permissionId, array $params = array(), $level = 0)
    {
        if (!isset($this->ACEs[$roleId][$resourceId][$permissionId]))
            return null;
        else {
            $allowedAny = null;
            foreach ($this->ACEs[$roleId][$resourceId][$permissionId] as $ace) {
                $allowed = $ace->isAllowed($params);
                if (isset($this->logger)) {
                    $this->logger->addRecord(Logger::INFO, sprintf(" %s%s ACE (class: %s) {resource: %s (class: %s), role: %s (class: %s), permission: %s (class: %s)}",
                        str_repeat('  ', $level),
                        isset($allowed)?($allowed?'Access granted by':'Access denied by'):'No decision from',
                        $ace,
                        $ace->getResource(),
                        get_class($ace->getResource()),
                        $ace->getRole(),
                        get_class($ace->getRole()),
                        $this->permissions[$permissionId],
                        get_class($this->permissions[$permissionId])
                    ));
                }
                if (isset($allowed)) {
                    if (!$allowed)
                        return false;
                    else
                        $allowedAny = true;
                }
            }
            return $allowedAny;
        }
    }

}
