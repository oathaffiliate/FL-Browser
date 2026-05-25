#pragma once
#include <QDebug>
#include <QtWidgets/QDockWidget>
#include <QtWidgets/QMainWindow>
#include <QLabel>
#include <QTreeView>
#include <QFileSystemModel>
#include <QMediaPlayer>
#include <QAudioOutput>
#include <QVideoWidget>
#include <QPushButton>
#include <QTimer>


class FLBrowserapp1 : public QMainWindow
{
    Q_OBJECT

public:
    FLBrowserapp1(QWidget *parent = nullptr);
    ~FLBrowserapp1();

private:
    bool switching = false;
    QDockWidget* widget;
    QTreeView* yourTreeView;
    QFileSystemModel* files;
    QMediaPlayer* player;
    QAudioOutput* audioOutput;
    QVideoWidget* vidPlayer;
    QDockWidget* audioPreview;
    QTimer* previewTimer;

private slots:

    void clickedFile(const QModelIndex& index);
    void onPlaybackChanged(QMediaPlayer::PlaybackState state);
    void onVideoAvailable(bool available);
};


