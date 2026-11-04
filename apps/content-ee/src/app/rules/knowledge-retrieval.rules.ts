import { AppConfigService } from '@alfresco/adf-core';
import { RuleContext } from '@alfresco/adf-extensions';
import {
  isFavorites,
  isLibraryContent,
  isLibraries,
  isPersonalFiles,
  isRecentFiles,
  isSearchResults,
  isSharedFiles
} from '@alfresco/aca-shared/rules';

interface AcaRuleContext extends RuleContext {
  appConfig: AppConfigService;
}

/** Project explorer routes (`/projects`, `/document-management`). */
export function isProjectExplorer(context: RuleContext): boolean {
  const { url } = context.navigation;
  return !!url && (url.startsWith('/projects') || url.startsWith('/document-management'));
}

/**
 * Same as ACA default, plus project explorer so Ask Discovery appears in that toolbar.
 */
export function canDisplayKnowledgeRetrievalButton(context: AcaRuleContext): boolean {
  return (
    context.appConfig.get('plugins.knowledgeRetrievalEnabled', false) &&
    (isPersonalFiles(context) ||
      isSharedFiles(context) ||
      isRecentFiles(context) ||
      isFavorites(context) ||
      isProjectExplorer(context) ||
      ((isSearchResults(context) || isLibraryContent(context)) && !isLibraries(context)))
  );
}
