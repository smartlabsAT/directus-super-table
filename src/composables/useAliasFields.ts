import { computed, unref, type ComputedRef, type Ref } from "vue";
import { Query } from "@directus/types";
import { get, getSimpleHash } from "@directus/utils";
// CORE IMPORTS
import { adjustFieldsForDisplays } from "../utils/adjustFieldsForDisplays";

export type AliasFields =
    | {
          fieldName: string;
          fieldAlias: string;
          fields: string[];
          key: string;
          aliased: true;
      }
    | {
          fieldName: string;
          fields: string[];
          key: string;
          aliased: false;
      };

type UsableAliasFields = {
    aliasedFields: ComputedRef<Record<string, AliasFields>>;
    aliasQuery: ComputedRef<Query["alias"]>;
    aliasedKeys: ComputedRef<string[]>;
    getFromAliasedItem: <K, T extends Record<string, K>>(
        item: T,
        key: string
    ) => K | undefined;
};

/**
 * Generates aliases for field collisions when fetching the data for each display.
 * @param fields This list of fields to be aliased
 * @param collection The collection the fields belong to
 * @returns Info about the display fields and if the original fields were aliased
 */
export function useAliasFields(
    fields: Ref<string[]> | string[],
    collection: Ref<string | null> | string | null
): UsableAliasFields {
    const aliasedFields = computed(() => {
        const aliasedFields: Record<string, AliasFields> = {};

        const _fields = unref(fields);
        const _collection = unref(collection);

        if (!_fields || _fields.length === 0 || !_collection)
            return aliasedFields;

        // Group fields by their root relation
        const fieldsByRoot = _fields.reduce<Record<string, string[]>>(
            (acc, field) => {
                const fieldName = (field.split(".") as [string])[0];
                if (!acc[fieldName]) acc[fieldName] = [];
                acc[fieldName].push(field);
                return acc;
            },
            {}
        );

        // Determine which roots need aliasing (when there are multiple different fields from same relation)
        const needsAliasing = Object.entries(fieldsByRoot).reduce<Record<string, boolean>>(
            (acc, [root, fields]) => {
                // Check if we have multiple different nested fields from the same root
                const uniqueFields = [...new Set(fields)];
                acc[root] = uniqueFields.length > 1 && uniqueFields.some(f => f.includes('.'));
                return acc;
            },
            {}
        );

        for (const field of _fields) {
            const fieldName = (field.split(".") as [string])[0];

            if (!needsAliasing[fieldName]) {
                aliasedFields[field] = {
                    key: field,
                    fieldName,
                    fields: adjustFieldsForDisplays([field], _collection),
                    aliased: false,
                };
            } else {
                // For relations with multiple fields, we don't alias them individually
                // Instead, we fetch all fields and extract what we need
                aliasedFields[field] = {
                    key: field,
                    fieldName,
                    fields: adjustFieldsForDisplays([field], _collection),
                    aliased: false,
                };
            }
        }

        return aliasedFields;
    });

    const aliasedKeys = computed(() => {
        return Object.values(aliasedFields.value).reduce<string[]>(
            (acc, field) => {
                if (field.aliased) {
                    acc.push(field.fieldAlias);
                }

                return acc;
            },
            []
        );
    });

    const aliasQuery = computed(() => {
        if (!aliasedFields.value) return null;
        return Object.values(aliasedFields.value).reduce<
            Record<string, string>
        >((acc, value) => {
            if (value.aliased) {
                // For nested fields, we need to use just the root field name as the alias value
                // The alias key (fieldAlias) is already a hash without periods
                acc[value.fieldAlias] = value.fieldName;
            }

            return acc;
        }, {});
    });

    /**
     * Returns the value of the given key from the given item, taking into account aliased fields
     * @param item The item to get the value from
     * @param key The key to get the value for without any alias
     * @returns The value of the given key from the given item
     */
    function getFromAliasedItem<K, T extends Record<string, K>>(
        item: T,
        key: string
    ): K | undefined {
        const aliasInfo = Object.values(aliasedFields.value).find(
            (field) => field.key === key
        );

        // Skip any nested fields prefixed with $ as they dont exist. ($thumbnail as an example)
        key = key.includes(".")
            ? key
                  .split(".")
                  .filter((k) => !k.startsWith("$"))
                  .join(".")
            : key;

        if (!aliasInfo || !aliasInfo.aliased) return get(item, key);

        if (key.includes(".") === false) return get(item, aliasInfo.fieldAlias);

        return get(
            item,
            `${aliasInfo.fieldAlias}.${key.split(".").slice(1).join(".")}`
        );
    }

    return { aliasedFields, aliasQuery, aliasedKeys, getFromAliasedItem };
}
