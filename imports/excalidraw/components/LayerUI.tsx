/* eslint-disable indent */
import clsx from 'clsx'
import React from 'react'
import { ActionManager } from '../actions/manager'
import { CLASSES, LIBRARY_SIDEBAR_WIDTH } from '../constants'
import { exportCanvas } from '../data'
import { isTextElement, showSelectedShapeActions } from '../element'
import { NonDeletedExcalidrawElement } from '../element/types'
import { Language, t } from '/imports/i18n'
import { calculateScrollCenter } from '../scene'
import { ExportType } from '../scene/types'
import { AppProps, AppState, ExcalidrawProps, BinaryFiles, UIChildrenComponents } from '../types'
import { muteFSAbortError, ReactChildrenToObject } from '../utils'
import { SelectedShapeActions, ShapesSwitcher } from './Actions'
import CollabButton from './CollabButton'
import { ErrorDialog } from './ErrorDialog'
import { ExportCB, ImageExportDialog } from './ImageExportDialog'
import { FixedSideContainer } from './FixedSideContainer'
import { HintViewer } from './HintViewer'
import { Island } from '/imports/components/Island'
import { LoadingMessage } from './LoadingMessage'
import { LockButton } from './LockButton'
import { MobileMenu } from './MobileMenu'
import { PasteChartDialog } from '../charts'
import { Section } from './Section'
import { ShortcutsDialog } from './ShortcutsDialog'
import Stack from './Stack'
import { UserList } from './UserList'
import Library from '../data/library'
import { JSONExportDialog } from './JSONExportDialog'
import { LibraryButton } from './LibraryButton'
import { isImageFileHandle } from '../data/blob'
import { LibraryMenu } from './LibraryMenu'

import './LayerUI.style.scss'
import './Toolbar.style.scss'
import { PenModeButton } from './PenModeButton'
import { trackEvent } from '../analytics'
import { isMenuOpenAtom, useDevice } from './ExcalidrawCore'
import { Stats } from './Stats'
import { actionToggleStats } from '../actions/actionToggleStats'
import Footer from './footer/Footer'
import { SidebarIcon, WelcomeScreenTopToolbarArrow } from '/imports/components/icons'
import { MenuLinks, Separator } from './MenuUtils'
import { useOutsideClickHook } from '../hooks/useOutsideClick'
import WelcomeScreen from './WelcomeScreen'
import { hostSidebarCountersAtom } from './Sidebar/Sidebar'
import { jotaiScope } from '../../store/jotai'
import { useAtom, useSetAtom } from 'jotai'
import { LanguageList } from '../app/components/LanguageList'
import WelcomeScreenDecor from './WelcomeScreenDecor'
import { isSidebarOpenAtom } from '/imports/store/atomSidebar'

interface LayerUIProps {
  actionManager: ActionManager
  appState: AppState
  files: BinaryFiles
  canvas: HTMLCanvasElement | null
  setAppState: React.Component<any, AppState>['setState']
  elements: readonly NonDeletedExcalidrawElement[]
  onCollabButtonClick?: () => void
  onLockToggle: () => void
  onPenModeToggle: () => void
  onInsertElements: (elements: readonly NonDeletedExcalidrawElement[]) => void
  showExitZenModeBtn: boolean
  langCode: Language['code']
  isCollaborating: boolean
  renderTopRightUI?: ExcalidrawProps['renderTopRightUI']
  renderCustomStats?: ExcalidrawProps['renderCustomStats']
  renderCustomSidebar?: ExcalidrawProps['renderSidebar']
  libraryReturnUrl: ExcalidrawProps['libraryReturnUrl']
  UIOptions: AppProps['UIOptions']
  focusContainer: () => void
  library: Library
  id: string
  onImageAction: (data: { insertOnCanvasDirectly: boolean }) => void
  renderWelcomeScreen: boolean
  children?: React.ReactNode
}

const LayerUI = ({
  actionManager,
  appState,
  files,
  setAppState,
  elements,
  canvas,
  onCollabButtonClick,
  onLockToggle,
  onPenModeToggle,
  onInsertElements,
  showExitZenModeBtn,
  isCollaborating,
  renderTopRightUI,

  renderCustomStats,
  renderCustomSidebar,
  libraryReturnUrl,
  UIOptions,
  focusContainer,
  library,
  id,
  onImageAction,
  renderWelcomeScreen,
  children
}: LayerUIProps) => {
  const device = useDevice()

  const childrenComponents = ReactChildrenToObject<UIChildrenComponents>(children)

  const renderJSONExportDialog = () => {
    if (!UIOptions.canvasActions.export) {
      return null
    }

    return (
      <JSONExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        exportOpts={UIOptions.canvasActions.export}
        canvas={canvas}
      />
    )
  }

  const renderImageExportDialog = () => {
    if (!UIOptions.canvasActions.saveAsImage) {
      return null
    }

    const createExporter =
      (type: ExportType): ExportCB =>
      async exportedElements => {
        trackEvent('export', type, 'ui')
        const fileHandle = await exportCanvas(type, exportedElements, appState, files, {
          exportBackground: appState.exportBackground,
          name: appState.name,
          viewBackgroundColor: appState.viewBackgroundColor
        })
          .catch(muteFSAbortError)
          .catch(error => {
            console.error(error)
            setAppState({ errorMessage: error.message })
          })

        if (appState.exportEmbedScene && fileHandle && isImageFileHandle(fileHandle)) {
          setAppState({ fileHandle })
        }
      }

    return (
      <ImageExportDialog
        elements={elements}
        appState={appState}
        setAppState={setAppState}
        files={files}
        actionManager={actionManager}
        onExportToPng={createExporter('png')}
        onExportToSvg={createExporter('svg')}
        onExportToClipboard={createExporter('clipboard')}
      />
    )
  }

  const [isMenuOpen, setIsMenuOpen] = useAtom(isMenuOpenAtom)
  const menuRef = useOutsideClickHook(() => setIsMenuOpen(false))
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom)

  const renderCanvasActions = () => (
    <div style={{ position: 'relative' }}>
      <button
        data-prevent-outside-click
        className={clsx('sidebar-button', 'zen-mode-transition', {
          'transition-left': appState.zenModeEnabled
        })}
        type='button'
        data-testid='sidebar-button'
        onClick={() => setIsSidebarOpen(isOpen => !isOpen)}
      >
        {SidebarIcon}
      </button>
    </div>
  )

  const renderSelectedShapeActions = () => (
    <Section
      heading='selectedShapeActions'
      className={clsx('selected-shape-actions zen-mode-transition', {
        'transition-left': appState.zenModeEnabled
      })}
    >
      <Island
        className={CLASSES.SHAPE_ACTIONS_MENU}
        padding={2}
        style={{
          // we want to make sure this doesn't overflow so subtracting the
          // approximate height of hamburgerMenu + footer
          maxHeight: `${appState.height - 166}px`
        }}
      >
        <SelectedShapeActions
          appState={appState}
          elements={elements}
          renderAction={actionManager.renderAction}
        />
      </Island>
    </Section>
  )

  const renderFixedSideContainer = () => {
    const shouldRenderSelectedShapeActions = showSelectedShapeActions(appState, elements)

    return (
      <FixedSideContainer side='top'>
        {renderWelcomeScreen && <WelcomeScreen />}
        <div className='App-menu App-menu_top'>
          <Stack.Col
            className={clsx('App-menu_top__left', {
              'disable-pointerEvents': appState.zenModeEnabled
            })}
          >
            {renderCanvasActions()}
            {shouldRenderSelectedShapeActions && renderSelectedShapeActions()}
          </Stack.Col>
          {!appState.viewModeEnabled && (
            <Section heading='shapes' className='shapes-section'>
              {(heading: React.ReactNode) => (
                <div style={{ position: 'relative' }}>
                  <WelcomeScreenDecor shouldRender={renderWelcomeScreen && !appState.isLoading}>
                    <div className='virgil WelcomeScreen-decor WelcomeScreen-decor--top-toolbar-pointer'>
                      <div className='WelcomeScreen-decor--top-toolbar-pointer__label'>
                        {t('welcomeScreen.toolbarHints')}
                      </div>
                      {WelcomeScreenTopToolbarArrow}
                    </div>
                  </WelcomeScreenDecor>

                  <Stack.Col gap={4} align='start'>
                    <Stack.Row
                      gap={1}
                      className={clsx('App-toolbar-container', {
                        'zen-mode': appState.zenModeEnabled
                      })}
                    >
                      <div
                        className={clsx('App-toolbar', {
                          'zen-mode': appState.zenModeEnabled
                        })}
                      >
                        <HintViewer
                          appState={appState}
                          elements={elements}
                          isMobile={device.isMobile}
                          device={device}
                        />
                        {heading}
                        <Stack.Row gap={1}>
                          <PenModeButton
                            zenModeEnabled={appState.zenModeEnabled}
                            checked={appState.penMode}
                            onChange={onPenModeToggle}
                            title={t('toolBar.penMode')}
                            penDetected={appState.penDetected}
                          />
                          <LockButton
                            zenModeEnabled={appState.zenModeEnabled}
                            checked={appState.activeTool.locked}
                            onChange={() => onLockToggle()}
                            title={t('toolBar.lock')}
                          />
                          <div className='App-toolbar__divider'></div>
                          <ShapesSwitcher
                            appState={appState}
                            canvas={canvas}
                            activeTool={appState.activeTool}
                            setAppState={setAppState}
                            onImageAction={({ pointerType }) => {
                              onImageAction({
                                insertOnCanvasDirectly: pointerType !== 'mouse'
                              })
                            }}
                          />
                          <div className='App-toolbar__divider'></div>
                          {!appState.viewModeEnabled && (
                            <LibraryButton appState={appState} setAppState={setAppState} />
                          )}
                        </Stack.Row>
                      </div>
                    </Stack.Row>
                  </Stack.Col>
                </div>
              )}
            </Section>
          )}
          <div
            className={clsx('layer-ui__wrapper__top-right zen-mode-transition', {
              'transition-right': appState.zenModeEnabled
            })}
          >
            <UserList collaborators={appState.collaborators} actionManager={actionManager} />
            {onCollabButtonClick && (
              <CollabButton
                isInHamburgerMenu={false}
                isCollaborating={isCollaborating}
                collaboratorCount={appState.collaborators.size}
                onClick={onCollabButtonClick}
              />
            )}
            {renderTopRightUI?.(device.isMobile, appState)}
          </div>
        </div>
        {isMenuOpen && (
          <div
            ref={menuRef}
            style={{ position: 'absolute', bottom: 75, marginTop: '.25rem', right: 12 }}
          >
            <Section heading='canvasActions'>
              {/* the zIndex ensures this menu has higher stacking order,
         see https://github.com/excalidraw/excalidraw/pull/1445 */}
              <Island className='menu-container' padding={2} style={{ zIndex: 1 }}>
                {actionManager.renderAction('toggleHelpIsland', undefined, true)}
                {!appState.viewModeEnabled && actionManager.renderAction('clearCanvas')}
                <Separator />
                <MenuLinks />
                <Separator />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    rowGap: '.5rem'
                  }}
                >
                  <div>{actionManager.renderAction('toggleTheme')}</div>
                  <div style={{ padding: '10px 0.625rem' }}>
                    <LanguageList style={{ width: '100%' }} />
                  </div>
                  {!appState.viewModeEnabled && (
                    <div>
                      <div style={{ fontSize: '.75rem', marginBottom: '.5rem' }}>
                        {t('labels.canvasBackground')}
                      </div>
                      <div style={{ padding: '0 0.625rem' }}>
                        {actionManager.renderAction('changeViewBackgroundColor', {
                          verticalOffset: -40
                        })}{' '}
                      </div>
                    </div>
                  )}
                </div>
              </Island>
            </Section>
          </div>
        )}
      </FixedSideContainer>
    )
  }

  const renderSidebars = () => {
    return appState.openSidebar === 'customSidebar' ? (
      renderCustomSidebar?.() || null
    ) : appState.openSidebar === 'library' ? (
      <LibraryMenu
        appState={appState}
        onInsertElements={onInsertElements}
        libraryReturnUrl={libraryReturnUrl}
        focusContainer={focusContainer}
        library={library}
        id={id}
      />
    ) : null
  }

  const [hostSidebarCounters] = useAtom(hostSidebarCountersAtom, jotaiScope)

  return (
    <>
      {appState.isLoading && <LoadingMessage delay={250} />}
      {appState.errorMessage && (
        <ErrorDialog
          message={appState.errorMessage}
          onClose={() => setAppState({ errorMessage: null })}
        />
      )}
      {appState.openDialog === 'help' && (
        <ShortcutsDialog
          onClose={() => {
            setAppState({ openDialog: null })
          }}
        />
      )}
      {renderImageExportDialog()}
      {appState.pasteDialog.shown && (
        <PasteChartDialog
          setAppState={setAppState}
          appState={appState}
          onInsertChart={onInsertElements}
          onClose={() =>
            setAppState({
              pasteDialog: { shown: false, data: null }
            })
          }
        />
      )}
      {device.isMobile && (
        <MobileMenu
          renderWelcomeScreen={renderWelcomeScreen}
          appState={appState}
          elements={elements}
          actionManager={actionManager}
          renderJSONExportDialog={renderJSONExportDialog}
          renderImageExportDialog={renderImageExportDialog}
          setAppState={setAppState}
          onCollabButtonClick={onCollabButtonClick}
          onLockToggle={() => onLockToggle()}
          onPenModeToggle={onPenModeToggle}
          canvas={canvas}
          isCollaborating={isCollaborating}
          onImageAction={onImageAction}
          renderTopRightUI={renderTopRightUI}
          renderCustomStats={renderCustomStats}
          renderSidebars={renderSidebars}
          device={device}
        />
      )}

      {!device.isMobile && (
        <>
          <div
            className={clsx('layer-ui__wrapper', {
              'disable-pointerEvents':
                appState.draggingElement ||
                appState.resizingElement ||
                (appState.editingElement && !isTextElement(appState.editingElement))
            })}
            style={
              ((appState.openSidebar === 'library' && appState.isSidebarDocked) ||
                hostSidebarCounters.docked) &&
              device.canDeviceFitSidebar
                ? { width: `calc(100% - ${LIBRARY_SIDEBAR_WIDTH}px)` }
                : {}
            }
          >
            {renderFixedSideContainer()}
            <Footer
              renderWelcomeScreen={renderWelcomeScreen}
              appState={appState}
              actionManager={actionManager}
              showExitZenModeBtn={showExitZenModeBtn}
            >
              {childrenComponents.FooterCenter}
            </Footer>

            {appState.showStats && (
              <Stats
                appState={appState}
                setAppState={setAppState}
                elements={elements}
                onClose={() => {
                  actionManager.executeAction(actionToggleStats)
                }}
                renderCustomStats={renderCustomStats}
              />
            )}
            {appState.scrolledOutside && (
              <button
                className='scroll-back-to-content'
                onClick={() => {
                  setAppState({
                    ...calculateScrollCenter(elements, appState, canvas)
                  })
                }}
              >
                {t('buttons.scrollBackToContent')}
              </button>
            )}
          </div>
          {renderSidebars()}
        </>
      )}
    </>
  )
}

const areEqual = (prev: LayerUIProps, next: LayerUIProps) => {
  const getNecessaryObj = (appState: AppState): Partial<AppState> => {
    const { suggestedBindings, startBoundElement: boundElement, ...ret } = appState
    return ret
  }
  const prevAppState = getNecessaryObj(prev.appState)
  const nextAppState = getNecessaryObj(next.appState)

  const keys = Object.keys(prevAppState) as (keyof Partial<AppState>)[]

  return (
    prev.renderTopRightUI === next.renderTopRightUI &&
    prev.renderCustomStats === next.renderCustomStats &&
    prev.renderCustomSidebar === next.renderCustomSidebar &&
    prev.langCode === next.langCode &&
    prev.elements === next.elements &&
    prev.files === next.files &&
    keys.every(key => prevAppState[key] === nextAppState[key])
  )
}

export default React.memo(LayerUI, areEqual)
